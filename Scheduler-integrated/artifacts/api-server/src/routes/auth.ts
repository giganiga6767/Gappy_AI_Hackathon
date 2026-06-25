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

router.get("/auth/google/callback", (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.redirect("/#auth=error");
    return;
  }
  const user = {
    id: `google-${Date.now()}`,
    name: "Google User (Demo)",
    email: "user@gmail.com",
    avatarInitials: "GU",
    role: "google",
  };
  const clientUrl = `http://localhost:${process.env.PORT_FRONTEND || "19211"}`;
  const encoded = encodeURIComponent(JSON.stringify(user));
  res.redirect(`${clientUrl}/#auth=google&user=${encoded}`);
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

router.get("/auth/github/callback", (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.redirect("/#auth=error");
    return;
  }
  const user = {
    id: `github-${Date.now()}`,
    name: "GitHub User",
    email: "user@github.com",
    avatarInitials: "GH",
    role: "github",
  };
  const clientUrl = `http://localhost:${process.env.PORT_FRONTEND || "19211"}`;
  const encoded = encodeURIComponent(JSON.stringify(user));
  res.redirect(`${clientUrl}/#auth=github&user=${encoded}`);
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
