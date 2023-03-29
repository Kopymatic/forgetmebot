import { Model } from "sequelize";

export class NoContext extends Model {
  // Specifying data types on the class itself so the compiler doesnt complain
  declare id: number;
  declare guildid: string;
  declare imagelink: string;
  declare linktag: string;
  declare texttag: string;
  declare importerid: string;
  declare importmessageid: string;
}
