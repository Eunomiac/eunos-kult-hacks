
import "./fvtt-types-config";
import "./general-types";
import "./custom-wiggle";
import "./k4lt/sheets/k4ltActor";
import "./k4lt/sheets/k4ltitemsheet";
import "./k4lt/sheets/k4ltNPCsheet";
import "./k4lt/sheets/k4ltPCsheet";
import "./k4lt/system/helpers";
import "./k4lt/system/logger";
import "./k4lt/system/macros";
import "./k4lt/system/settings";
import "./k4lt/system/tracker";
// import "./system-types";

declare module "virtual:colors" {
  export const Colors: Record<string, string>;
}
