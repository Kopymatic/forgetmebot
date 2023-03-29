import { PrismaClient } from "@prisma/client";
import { randomInt } from "crypto";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { Client, Constants, Guild, User } from "oceanic.js";
import { CommandHandler } from "oceanic.js-interactions";
dotenv.config();
import { DataTypes, Sequelize } from "sequelize";
import { NoContext } from "./oldTables";
import Commands from "./commands";
import Cumulonimbus from "cumulonimbus-wrapper";

export const prisma = new PrismaClient();
export let client: Client;
export let handler: CommandHandler;
export let cumulonimbus: Cumulonimbus;

async function main() {
  client = new Client({
    auth: `Bot ${process.env.BOT_TOKEN}`,
    gateway: {
      intents: [
        "GUILDS",
        "DIRECT_MESSAGES",
        "GUILD_MESSAGES",
        "MESSAGE_CONTENT",
      ],
    },
  });
  handler = new CommandHandler(client);
  if (!process.env.CUM_TOKEN) {
    console.log("NO CUM TOKEN??? UNACCEPTABLE");
    return;
  }
  cumulonimbus = new Cumulonimbus(process.env.CUM_TOKEN);

  // Handle unregistered message components.
  handler.on("unhandledMessageComponent", (interaction) => {
    interaction.createMessage({
      content: "i forgor 💀",
      flags: Constants.MessageFlags.EPHEMERAL,
    });
  });

  client.once("ready", async () => {
    console.log("Ready as", client.user?.username);

    // await migrate();

    console.log("Publishing Commands");

    handler.publishCommands();
  });

  client.on("error", (err) => {
    console.error("Something Broke!", err);
  });

  handler.on("error", (err) => {
    console.error("Something Broke!", err);
  });

  console.log(" Registering slash commands...");
  // Register the command modules
  for (const command of Commands) {
    console.log(` Adding command ${command.name}...`);
    handler.registerCommand(command);
  }

  client.connect();

  async function migrate() {
    let oldDb = new Sequelize(`${process.env.OLD_DATABASE_URL}`, {
      logging: false,
    });

    NoContext.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true,
        },
        guildid: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        imagelink: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        linktag: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        texttag: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        importerid: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        importmessageid: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
      },
      { sequelize: oldDb, tableName: "nocontext", timestamps: false }
    );

    let all = await NoContext.findAll({ order: [["id", "ASC"]] });

    all.forEach(async (entry) => {
      // console.log(entry);
      if (
        (await prisma.noContext.findFirst({ where: { id: entry.id } })) != null
      ) {
        console.log("Already exists!");
        return;
      }

      let guild = client.guilds.find((guild) => guild.id === entry.guildid);

      console.log(entry.guildid);
      console.log(guild?.id);

      let user = client.users.find((user) => user.id === entry.importerid);

      console.log(entry.importerid);
      console.log(user?.id);

      try {
        let finalEntry = await prisma.noContext.create({
          data: {
            imageLink: entry.imagelink,
            linkTag:
              entry.linktag?.toLowerCase() === "null" ? null : entry.linktag,
            textTag:
              entry.texttag?.toLowerCase() === "auto-imported"
                ? null
                : entry.texttag,
            guild: {
              connectOrCreate: {
                where: { id: entry.guildid },
                create: {
                  id: entry.guildid,
                  name: guild ? guild.name : "Unknown",
                  iconUrl: guild ? guild.iconURL() : null,
                },
              },
            },
            importer: {
              connectOrCreate: {
                where: { id: entry.importerid },
                create: {
                  id: entry.importerid,
                  username: user ? user.username : "Unknown",
                  avatarUrl: user ? user.avatarURL() : null,
                },
              },
            },
          },
        });
        // console.log(finalEntry);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
