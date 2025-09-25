const express = require("express");
const { exec } = require("child_process");
const app = express();

app.use(express.static(__dirname));
app.use(express.json());

// Exécute la commande envoyée
app.post("/exec", (req, res) => {
  const command = req.body.command;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.json({ output: stderr || "Erreur lors de l'exécution" });
    }
    res.json({ output: stdout || stderr });
  });
});

// Lance le serveur
app.listen(3000, () => {
  console.log("Terminal disponible sur http://localhost:3000/terminal.html");
});
