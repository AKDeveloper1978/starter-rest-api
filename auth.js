import jwt from "jsonwebtoken";

export const authenticateUser = (req, res, next) => {
  let point = 0;
  console.log(`認証:${++point}`);

  const authHeader = req.headers["authorization"];
  console.log(`認証:${++point}`);
  const bearerToken = authHeader && authHeader.split(" ")[1];
  console.log(`認証:${++point}`);

  if (!bearerToken) {
    console.log(`認証:${++point}`);
    res.sendStatus(401);
  } else {
    console.log(`認証:${++point}`);
    jwt.verify(bearerToken, process.env.TOKEN_SECRET, (err, user) => {
      if (err) {
        console.log(err);
        res.sendStatus(403);
      } else {
        req.user = user;
        next();
      }
    });
  }
};


export const generateAccessToken = (username) => {
  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: "1800s" });
};