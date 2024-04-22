import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import bcrypt from 'bcrypt';

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
  if (req.session.user) {
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

  if (bcrypt.compareSync(password, user.password) === false) {
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

app.post("/admin/create-user", async (req, res) => {
  const { name, email, role, password, rpassword } = req.body;

  const checkEmail = await prisma.users.findUnique({
    where: {
      email
    }
  })

  if(role === "select") {
    return console.log("Please select a role");
  }
  
  if(checkEmail) {
    return console.log("Email already exists");
  }

  if(!password === rpassword) {
    return console.log("Passwords do not match");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.users.create({
    data: {
      name: name,
      email: email,
      role: role,
      password: hashedPassword
    }
  });

  res.redirect("/admin");
});

app.get("/api/users", async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
  return res.json(users);
})

app.get("/api/maintenance", async (req, res) => {
  const getMaintenance = await prisma.maintenance.findMany();
  return res.json(getMaintenance);
})

app.get("/admin/users", (req, res) => {
  res.sendFile(__dirname + "/pages/admin/users.html");
});

app.get("/admin/manage-user/:id", async (req, res) => {
  const checkUser = await prisma.users.findMany({
    where: {
      id: Number(req.params.id)
    }
  });

  if(checkUser.length === 0) {
    return res.redirect("/admin/users");
  }

  if(req.session.user && req.session.user.id) {
    if(req.session.user.id === checkUser[0].id) {
      return res.redirect("/admin/users");
    }
  }

  res.sendFile(__dirname + "/pages/admin/manage-user.html");
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});