import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import session from 'express-session';

declare module 'express-session' {
  export interface SessionData {
    user: { [key: string]: any };
  }
}

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('trust proxy', 1);
app.use(session({
  secret: "YOU_WILL_NEVER_GUESS_THIS_POGGERS_NETTAVIS_SECRET",
  resave: false,
  saveUninitialized: false,
}))

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/pages/index.html");
});

app.get("/login", (req: express.Request, res: express.Response) => {
  if ((req.session as any).user) {
    return res.redirect("/");
  } else {
    res.sendFile(__dirname + "/pages/login.html");
  }
})

app.get("/admin", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  } else {
    if (!(req.session.user.role === "admin")) {
      return res.redirect("/");
    } else if (req.session.user.role === "admin") {
      return res.sendFile(__dirname + "/pages/admin.html");
    }
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findUnique({
    where: {
      email
    }
  });
  if (!user) {
    return console.log("User not found");
  }

  if (user.password !== password) {
    return console.log("Invalid password")
  }

  req.session.user = {
    id: user.id,
    role: user.role
  };

  res.redirect("/");
});

const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if(req.session && req.session.user && req.session.user.role !== "admin") {
    return res.redirect("/");
  } else if (req.session && req.session.user && req.session.user.role === "admin") {
    return next();
  } else {
    return res.redirect("/login");
  }
}

app.use("/admin", checkAdmin);

app.get("/admin/create-user", (req, res) => {
  res.sendFile(__dirname + "/pages/admin/create-user.html");
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});