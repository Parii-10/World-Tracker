import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "worldTour",
  password: "1234",
  port: 5432
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries JOIN users ON user_id = users.id WHERE users.id = ($1)",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

//to get data
app.get("/", async(req,res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs",{
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

//to add data
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
      const data = result.rows[0];
      let countryCode = data.country_code;

    if (countryCode === "IO") {
      countryCode = "IN";
    }
    
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//to add current user data
app.post("/user", async (req, res) => {
  if(req.body.add === "new"){
    res.render("new.ejs");
  }
  else{
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

//to add new user
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query("INSERT INTO users (name, color) VALUES ($1,$2) RETURNING *;", [name, color]);

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

//to delete country
app.post("/delete", async(req,res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
      const data = result.rows[0];
      let countryCode = data.country_code;

    if (countryCode === "IO") {
      countryCode = "IN";
    }
    
    try {
      await db.query(
        "DELETE FROM visited_countries WHERE country_code = ($1) AND user_id = ($2) ;",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }

});

app.listen(port, () => {
  console.log(`Server running on port: http://localhost:${port}/ `);
});