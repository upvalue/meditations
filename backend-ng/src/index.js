"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const model_1 = __importDefault(require("./model"));
const graphql_1 = __importDefault(require("./graphql"));
console.log(model_1.default);
// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
graphql_1.default.listen().then((thing) => {
    const { url } = thing;
    console.log(`🚀  Server ready at ${url} !`);
});
