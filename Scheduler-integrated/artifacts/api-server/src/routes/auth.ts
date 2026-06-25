import { Router } from "express";

const router = Router();

router.get("/auth/google", (_req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    res.redirect(`${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/google/callback?code=mock-google-bypass`);
    return;
  }
  const redirectUri = encodeURIComponent(`${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/google/callback`);
  const scope = encodeURIComponent("openid email profile");
  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
  );
});

router.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.redirect("/#auth=error");
    return;
  }
  const clientUrl = `http://localhost:${process.env.PORT_FRONTEND || "19211"}`;

  // If mock bypass
  if (code === "mock-google-bypass" || !process.env.GOOGLE_CLIENT_ID) {
    const user = {
      id: `google-mock-${Date.now()}`,
      name: "Google User (Demo)",
      email: "user@gmail.com",
      avatarInitials: "GU",
      role: "google",
    };
    const encoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${clientUrl}/#auth=google&user=${encoded}`);
    return;
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch Google user profile");
    }

    const userData = await userResponse.json() as any;
    const initials = userData.name
      ? userData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
      : "GU";

    const user = {
      id: `google-${userData.id}`,
      name: userData.name || "Google User",
      email: userData.email || "",
      avatarInitials: initials,
      role: "google" as const,
    };

    const encoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${clientUrl}/#auth=google&user=${encoded}`);
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    res.redirect(`${clientUrl}/#auth=error&message=${encodeURIComponent(err.message)}`);
  }
});

router.get("/auth/github", (_req, res) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  if (!githubClientId) {
    res.redirect(`${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/github/callback?code=mock-github-bypass`);
    return;
  }
  const redirectUri = encodeURIComponent(`${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/github/callback`);
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=user:email`
  );
});

router.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.redirect("/#auth=error");
    return;
  }
  const clientUrl = `http://localhost:${process.env.PORT_FRONTEND || "19211"}`;

  // If mock bypass
  if (code === "mock-github-bypass" || !process.env.GITHUB_CLIENT_ID) {
    const user = {
      id: `github-mock-${Date.now()}`,
      name: "GitHub User (Demo)",
      email: "user@github.com",
      avatarInitials: "GH",
      role: "github",
    };
    const encoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${clientUrl}/#auth=github&user=${encoded}`);
    return;
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET || "",
        code: code as string,
        redirect_uri: `${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/github/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`GitHub token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error(`GitHub auth response did not return an access token: ${JSON.stringify(tokenData)}`);
    }

    // 2. Fetch user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "NexusDesk",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch GitHub user profile");
    }

    const userData = await userResponse.json() as any;

    // 3. Resolve private email if missing
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "NexusDesk",
        },
      });
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json() as any[];
        const primaryEmailObj = emails.find((e) => e.primary && e.verified) || emails[0];
        if (primaryEmailObj) {
          email = primaryEmailObj.email;
        }
      }
    }

    const initials = userData.name
      ? userData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
      : userData.login
      ? userData.login.slice(0, 2).toUpperCase()
      : "GH";

    const user = {
      id: `github-${userData.id}`,
      name: userData.name || userData.login || "GitHub User",
      email: email || "",
      avatarInitials: initials,
      role: "github" as const,
    };

    const encoded = encodeURIComponent(JSON.stringify(user));
    res.redirect(`${clientUrl}/#auth=github&user=${encoded}`);
  } catch (err: any) {
    console.error("GitHub OAuth error:", err);
    res.redirect(`${clientUrl}/#auth=error&message=${encodeURIComponent(err.message)}`);
  }
});

router.post("/auth/guest", (_req, res) => {
  res.json({
    user: {
      id: "guest-001",
      name: "Guest User",
      email: "guest@nexusdesk.local",
      avatarInitials: "GU",
      role: "guest",
    }
  });
});

router.get("/auth/me", (req, res) => {
  res.json({ authenticated: false, message: "Use guest bypass or OAuth to authenticate." });
});

export default router;
