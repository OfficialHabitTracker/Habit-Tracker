const jwt = require("jsonwebtoken");

function requireLogin(jwtSecret) {
  return (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.id === undefined || decoded.id === null) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please log in.",
        });
      }

      req.userId = decoded.id;
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        message: "Your session is invalid or has expired. Please log in again.",
      });
    }
  };
}

module.exports = requireLogin;
