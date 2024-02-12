import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/customers", async (req, res) => {
  if (req.isAuthenticated()) {
    let allCustomers = {};
    try {
      const result = await db.query("SELECT * FROM customers WHERE 1 = 1 OR id = $1 ORDER BY current_status DESC", [
        1,
      ]);
      allCustomers = result.rows;
      let status = {};
      let openCustomers = [];
      let closedCustomers = [];
    for (let i in result.rows) {
        try {
          status = JSON.parse(result.rows[i].current_status).category;
        } catch (err) {
          status = result.rows[i].current_status
        }
        console.log(status);
        if (status === "open") {
          openCustomers.push(result.rows[i]);
        } else {
          closedCustomers.push(result.rows[i]);
        }
      }
      allCustomers = {open : openCustomers, closed : closedCustomers};
    } catch (err) {
      console.log(err)
    }

    //console.log(allCustomers);
    res.render("listCustomers.ejs", {
      data : allCustomers
    });
    //TODO: Update this to pull in the user secret to render in listCustomers.ejs
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  res.render("submit.ejs");
})

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/customers",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
            const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/customers");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//TODO: Create the post route for submit.
//Handle the submitted data and add it to the database

app.post("/addCustomer", async (req, res) => {
  console.log("attempting to add a customer", req.body.primaryPhone);
  try {
    console.log(req.body);
    const result = await db.query(
      "INSERT INTO customers (full_name, primary_phone, primary_email, contact_other, current_status, contact_history) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.body.fullName, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, "open", req.body.contactHistory]
    );
    const newCustomer = result.rows[0];
  } catch (err) {
    console.log(err);  
  }  
  res.redirect("/customers");
});


app.post("/updateCustomer/:id", async (req, res) => {
  console.log( req.params);
  const userID = parseInt(req.params.id);
  console.log(userID);
  // a known fault is that this will not set non alphabetical characters {} " ' etc - you need to excape them
  const updateSQL = "UPDATE customers SET     full_name='" + req.body.fullName + "', " +
                                          "primary_phone='" + req.body.primaryPhone + "', " +
                                          "primary_email='" + req.body.primaryEmail + "', " +
                                          "contact_other='" + req.body.contactOther + "', " + 
                                          "current_status=null, " + 
                                          "contact_history='" + req.body.contactHistory + "' " +
                    "WHERE id=" + userID + " RETURNING *"    
  console.log(updateSQL);
  try {
     const result = await db.query(updateSQL   

      //  "UPDATE customers SET full_name='$1', primary_phone='$2', primary_email='$3', contact_other='$4', current_status='$5', contact_history='$6') WHERE id=$7 RETURNING *",
      //  [req.body.fullName, req.body.primaryPhone, req.body.primaryEmail, req.body.contactOther, null, req.body.contactHistory, 5]
     );
    const updatedCustomer = result.rows[0];
  } catch (err) {
     console.log(err);  
  }  
  res.redirect("/customers");
});


passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("Sorry, we do not recognise you as an active user of our system.");
        // known issue: page should redirect to the register screen.  To reproduce this error enter an unknown username into the login screen
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
