import { wrapGMMoves } from "./utilities";

function getItemsOfType(type: Item["type"]) {
  return getGame().items?.filter(item => item.type === type);
}
