const fs = require("fs").promises;
const path = require("path");
const { Collection } = require("discord.js");
const Table = require("cli-table3");

module.exports = async (client) => {
  const commandFolders = ["Everyone", "Whitelisted", "Owners"];

  const table = new Table({
    head: ["Prefix Commands", "Status"],
    style: { head: ["cyan"], border: ["grey"] },
    wordWrap: true,
    colWidths: [50, 20],
  });

    client.prefixCommands = new Collection();

  for (const folder of commandFolders) {
    const commandsFolder = path.join(__dirname, `../PrefixCommands/${folder}`);

    try {
      const folderContents = await fs.readdir(commandsFolder, { withFileTypes: true });

      // Folder title row
      table.push([{ colSpan: 2, content: `📂 ${folder}`, hAlign: "left" }]);

      // ───────── Direct JS files (no topic) ─────────
      const directJsFiles = folderContents
        .filter(item => item.isFile() && item.name.endsWith(".js"))
        .map(item => item.name);

      for (const file of directJsFiles) {
        try {
          const command = require(path.join(commandsFolder, file));

          if (command.name && typeof command.execute === "function") {
            client.prefixCommands.set(command.name, {
              ...command,
              folder,
              topic: "general",
            });

            table.push([`└── ${command.name}`, "✅ Loaded"]);
          } else {
            table.push([`└── ${file}`, "❌ Missing name/execute"]);
          }
        } catch (err) {
          console.error(`Error loading prefix command ${file}:`, err);
          table.push([`└── ${file}`, "❌ Error"]);
        }
      }

      // ───────── Topic folders ─────────
      const topicDirs = folderContents
        .filter(item => item.isDirectory())
        .map(item => item.name);

      for (const topic of topicDirs) {
        const topicFolder = path.join(commandsFolder, topic);

        try {
          const topicFiles = await fs.readdir(topicFolder);
          const jsFiles = topicFiles.filter(f => f.endsWith(".js"));

          if (jsFiles.length) {
            table.push([`  📁 ${topic}`, ""]);
          }

          for (const file of jsFiles) {
            try {
              const command = require(path.join(topicFolder, file));

              if (command.name && typeof command.execute === "function") {
                client.prefixCommands.set(command.name, {
                  ...command,
                  folder,
                  topic,
                });

                table.push([`    └── ${command.name}`, "✅ Loaded"]);
              } else {
                table.push([`    └── ${file}`, "❌ Missing name/execute"]);
              }
            } catch (err) {
              console.error(`Error loading ${file} from ${topic}:`, err);
              table.push([`    └── ${file}`, "❌ Error"]);
            }
          }
        } catch (err) {
          console.error(`Error reading topic folder ${topic}:`, err);
          table.push([`  📁 ${topic}`, "❌ Error"]);
        }
      }

      if (!directJsFiles.length && !topicDirs.length) {
        table.push(["(No commands found)", "✅ Empty"]);
      }
    } catch (err) {
      console.error(`Error reading ${folder} folder:`, err);
    }
  }

  if (process.env.DEV_MODE == "true") { 
  console.log(table.toString());
  console.log('\x1b[37m%s\x1b[0m', '(✅・Successfully Loaded Prefix Commands)'.bold.green);
  }
};
