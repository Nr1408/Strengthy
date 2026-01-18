from rest_framework import viewsets, permissions, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
import random
from rest_framework.authtoken.models import Token
import requests
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.shortcuts import redirect
from urllib.parse import quote
import json
from django.http import JsonResponse


from .models import Exercise, Workout, WorkoutSet, CardioSet, PasswordResetCode, Profile
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from .serializers import (
    ExerciseSerializer,
    WorkoutSerializer,
    WorkoutSetSerializer,
    CardioSetSerializer,
    RegisterSerializer,
    AccountUpdateSerializer,
    ProfileSerializer,
)

# Simple function-based view alias for public config, if needed by older
# URL patterns. It returns the same payload as PublicConfigView.
from rest_framework.decorators import api_view, permission_classes as drf_permission_classes
import logging

@api_view(["GET"])
@drf_permission_classes([permissions.AllowAny])
def public_config(request):
    web_id = getattr(settings, "GOOGLE_CLIENT_ID_WEB", "")
    android_id = getattr(settings, "GOOGLE_CLIENT_ID_ANDROID", "")

    return Response({
        "google_client_id_web": web_id,
        "google_client_id_android": android_id,
    })


def health_check(request):
    return JsonResponse({"status": "ok"})

@api_view(["GET", "POST"])
@drf_permission_classes([permissions.AllowAny])
def debug_echo_auth(request):
    """Temporary debug endpoint: returns the incoming Authorization header.

    Useful to verify whether clients are sending the `Authorization` header
    through proxies or during CORS requests. This endpoint is intended to
    be temporary and removed after debugging is complete.
    """
    auth_hdr = request.META.get("HTTP_AUTHORIZATION")
    try:
        # include a short request summary to help troubleshooting
        summary = {
            "method": request.method,
            "path": request.path,
            "authorization": auth_hdr,
        }
    except Exception:
        summary = {"authorization": auth_hdr}
    return Response(summary)


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return getattr(obj, "owner", None) == request.user
    
class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        return Exercise.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        try:
            serializer.save(owner=self.request.user)
        except IntegrityError:
            # Convert DB uniqueness violations into a 400 with a friendly message.
            raise ValidationError({"name": "You already have an exercise with that name."})
        
class WorkoutViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        return Workout.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
        
class WorkoutSetViewSet(viewsets.ModelViewSet):
    serializer_class = WorkoutSetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        qs = WorkoutSet.objects.filter(workout__owner=self.request.user)
        workout_id = self.request.query_params.get("workout")
        if workout_id:
            try:
                wid = int(workout_id)
                qs = qs.filter(workout_id=wid)
            except ValueError:
                pass
        return qs

    def create(self, request, *args, **kwargs):
        """Wrap creation to convert DB integrity errors into 400s and
        log unexpected exceptions so the API returns JSON instead of HTML 500 pages.
        """
        logger = logging.getLogger(__name__)
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            logger.warning("WorkoutSet create IntegrityError: %s", e)
            return Response({"detail": "Invalid data or duplicate set number."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Log full exception for debugging; return a JSON 500 response
            logger.exception("Unhandled error creating WorkoutSet")
            return Response({"detail": "Server error while creating set."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CardioSetViewSet(viewsets.ModelViewSet):
    serializer_class = CardioSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CardioSet.objects.filter(workout__owner=self.request.user)
        workout_id = self.request.query_params.get("workout")
        if workout_id:
            try:
                wid = int(workout_id)
                qs = qs.filter(workout_id=wid)
            except ValueError:
                pass
        exercise_id = self.request.query_params.get("exercise")
        if exercise_id:
            try:
                eid = int(exercise_id)
                qs = qs.filter(exercise_id=eid)
            except ValueError:
                pass
        return qs

class RegisterView(generics.CreateAPIView):
    serializer_class= RegisterSerializer
    permission_classes = [permissions.AllowAny]


class AccountSettingsView(generics.UpdateAPIView):
    """Allow an authenticated user to manage their own account.

    PATCH: update username/email/password (via AccountUpdateSerializer).
    DELETE: permanently delete the authenticated user's account and token.
    """

    serializer_class = AccountUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = request.user
        # Remove auth token if it exists
        try:
            Token.objects.filter(user=user).delete()
        except Exception:
            pass
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)





class PasswordResetRequestView(APIView):
    """Request a password reset OTP for a given email.

    In production you would email this code to the user. For now, in DEBUG
    mode we also include the code in the API response to simplify testing.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Don't leak whether the email exists; respond generically.
            return Response({"detail": "If an account exists, an OTP has been sent."})

        # Invalidate previous unused codes for this user
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        code = f"{random.randint(100000, 999999)}"
        PasswordResetCode.objects.create(user=user, code=code)

        # Try sending the OTP via email. If email settings are misconfigured,
        # we don't want the whole flow to break, so we catch errors.
        subject = "Your Strengthy password reset code"
        message = (
            "Hi,\n\n"
            "You requested to reset your Strengthy password.\n\n"
            f"Your one-time code is: {code}\n\n"
            "This code will expire in about 30 minutes. If you didn't request this, you can ignore this email.\n\n"
            "- The Strengthy Team"
        )
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)
        try:
            if from_email:
                send_mail(subject, message, from_email, [user.email], fail_silently=True)
        except Exception:
            # Silent fail; the API response will still be generic either way.
            pass

        payload = {"detail": "If an account exists, an OTP has been sent."}
        # In DEBUG, include the code in the response to make testing easy
        if getattr(settings, "DEBUG", False):
            payload["otp"] = code

        return Response(payload)


class PasswordResetConfirmView(APIView):
    """Confirm an OTP and set a new password for the user."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()
        otp = request.data.get("otp", "").strip()
        new_password = request.data.get("new_password", "")

        if not email or not otp or not new_password:
            return Response(
                {"detail": "Email, OTP and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Invalid OTP or email."}, status=status.HTTP_400_BAD_REQUEST)

        # Accept codes from the last 30 minutes
        cutoff = timezone.now() - timezone.timedelta(minutes=30)
        try:
            code_obj = (
                PasswordResetCode.objects.filter(
                    user=user,
                    code=otp,
                    is_used=False,
                    created_at__gte=cutoff,
                )
                .order_by("-created_at")
                .first()
            )
        except PasswordResetCode.DoesNotExist:
            code_obj = None

        if not code_obj:
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=["password"])

        code_obj.is_used = True
        code_obj.save(update_fields=["is_used"])

        return Response({"detail": "Password has been reset. You can now log in."})


class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile/onboarding data.

    GET returns the profile fields. PATCH updates the provided fields.
    """

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        # Ensure a Profile exists
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile


class GoogleLoginView(APIView):
    """Exchange a Google ID token for a Strengthy auth token.

    Expected POST payload: { "id_token": "..." } or { "credential": "..." }
    This view verifies the token with Google's tokeninfo endpoint, checks the
    audience if `GOOGLE_CLIENT_ID` is configured, then finds or creates a
    Django user and returns a token.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        id_token = (
            request.data.get("id_token")
            or request.data.get("credential")
            or request.data.get("token")
        )

        if not id_token:
            return Response({"detail": "id_token (credential) is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            resp = requests.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token}, timeout=5)
            if resp.status_code != 200:
                return Response({"detail": "Invalid ID token."}, status=status.HTTP_400_BAD_REQUEST)
            info = resp.json()
        except Exception:
            return Response({"detail": "Failed to verify ID token."}, status=status.HTTP_400_BAD_REQUEST)

        # Optionally verify audience
        aud = info.get("aud")
        configured_aud = getattr(settings, "GOOGLE_CLIENT_ID_WEB", "")
        if configured_aud:
            if aud != configured_aud:
                try:
                    print(f"AUD MISMATCH: Token had {aud}, settings had {configured_aud}")
                except Exception:
                    pass
                return Response({"detail": "Token audience does not match."}, status=status.HTTP_400_BAD_REQUEST)

        email = info.get("email")
        if not email:
            return Response({"detail": "No email found in token."}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create the user
        try:
            user = User.objects.get(email__iexact=email)
            # If the admin has disabled/deactivated this account (is_active=False)
            # treat it as deleted for the purposes of Google sign-in and create
            # a fresh user instead of re-using the inactive record.
            if not getattr(user, "is_active", True):
                raise User.DoesNotExist()
            created = False
        except User.DoesNotExist:
            # Create a simple user with an unusable password
            base = (email.split("@")[0] or "g_user")[:30]
            username = base
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{suffix}"
                suffix += 1
            user = User.objects.create(username=username, email=email)
            # Try to set the user's name from the token if available
            full_name = info.get("name") or ""
            if full_name:
                # Attempt to split into first/last name
                parts = full_name.split()
                if len(parts) == 1:
                    user.first_name = parts[0][:30]
                else:
                    user.first_name = parts[0][:30]
                    user.last_name = " ".join(parts[1:])[:150]
            user.set_unusable_password()
            user.save()
            created = True

        # If user exists, ensure name fields are present when possible
        try:
            token_name = info.get("name")
            if token_name and (not user.first_name):
                parts = token_name.split()
                if len(parts) == 1:
                    user.first_name = parts[0][:30]
                else:
                    user.first_name = parts[0][:30]
                    user.last_name = " ".join(parts[1:])[:150]
                user.save(update_fields=["first_name", "last_name"])
        except Exception:
            # Non-fatal: if anything goes wrong parsing name, ignore.
            pass

        token_obj, _ = Token.objects.get_or_create(user=user)
        out = {"token": token_obj.key, "email": user.email, "username": user.username, "name": user.get_full_name()}
        if created:
            out["created"] = True
        return Response(out)


@csrf_exempt
def GoogleRedirectReceiver(request):
    """Receive Google Identity POST redirect and forward credential to the SPA.

    Google will POST a form with a 'credential' field to the configured
    login_uri. This view extracts that credential and issues a redirect
    to the frontend with the credential included in the URL fragment so
    that client-side code can complete the login.
    """

    credential = (
    request.POST.get("credential")
    or request.POST.get("id_token")
    or request.GET.get("credential")
    or request.GET.get("id_token")
    or ""
)


    # Determine the base frontend URL. Prefer an explicit FRONTEND_URL setting
    # but fall back to the same origin as this backend. When the request
    # originates from the Android APK using the http://localhost origin,
    # force the redirect host to http://localhost (no port) so it matches the
    # WebView's origin and the Google Console configuration.
    origin = request.META.get("HTTP_ORIGIN", "") or ""

    if origin == "http://localhost":
        frontend_base = "http://localhost"
    else:
        frontend_base = (
            getattr(settings, "FRONTEND_URL", "").rstrip("/")
            or "https://strengthy-strengthy-frontend.vercel.app"
            )


    # If no credential was provided, this may be the client's fallback
    # redirect that includes diagnostic params like `reason` and `origin`.
    # Instead of bouncing back to the SPA immediately, initiate an
    # OpenID Connect redirect to Google's authorization endpoint using
    # `response_mode=form_post` so Google will POST an `id_token` to
    # this same endpoint when the user completes sign-in. That POST
    # will then be forwarded to the SPA as a fragment for client-side
    # handling (see below).
    if not credential:
        reason = request.GET.get("reason", "")
        origin_param = request.GET.get("origin", "")
        if reason or origin_param:
            try:
                print(f"[GSI_FALLBACK] reason={reason} origin={origin_param}")
            except Exception:
                pass

            # Build an absolute redirect_uri pointing back to this view
            # which will receive the form_post from Google containing the id_token.
            redirect_uri = request.build_absolute_uri(request.path)

            # Use configured client id or fallback constant used elsewhere
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or "682920475586-h98muldc2oqab094un02au2k8c5cj9i1.apps.googleusercontent.com"

            # Construct the Google OAuth2/OIDC authorization URL requesting an id_token
            # and instruct Google to send it via form_post to our redirect_uri.
            from urllib.parse import urlencode

            auth_params = {
                "client_id": client_id,
                "response_type": "id_token",
                "response_mode": "form_post",
                "scope": "openid email profile",
                "redirect_uri": redirect_uri,
                "prompt": "select_account",
            }
            auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(auth_params)

            return redirect(auth_url)
        
    print("FRONTEND_URL setting:", getattr(settings, "FRONTEND_URL", None))

    target = f"{frontend_base}/auth/google/redirect/#credential={quote(credential or '')}"
    return redirect(target)