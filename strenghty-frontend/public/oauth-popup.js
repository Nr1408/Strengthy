(function () {
  function relay() {
    try {
      var hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      var accessToken = hash.get("access_token");
      var idToken = hash.get("id_token");
      if (!accessToken) return;

      try {
        sessionStorage.setItem("supabase_oauth_popup", "1");
      } catch (e) {}

      try {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "supabase-oauth-result",
              accessToken: accessToken,
              idToken: idToken || null,
            },
            "*",
          );
        }
      } catch (e) {}

      try {
        localStorage.setItem(
          "supabase:oauth_result",
          JSON.stringify({
            accessToken: accessToken,
            idToken: idToken || null,
          }),
        );
      } catch (e) {}

      try {
        var ch = new BroadcastChannel("supabase_oauth");
        ch.postMessage({
          type: "supabase-oauth-result",
          accessToken: accessToken,
          idToken: idToken || null,
        });
        ch.close();
      } catch (e) {}
    } catch (e) {}

    try {
      window.close();
    } catch (e) {}
  }

  relay();
  var timer = setInterval(relay, 250);
  setTimeout(function () {
    clearInterval(timer);
  }, 5000);
})();
