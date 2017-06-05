import * as MediumEditor from 'medium-editor';
import * as $ from 'jquery';

const editor = new MediumEditor('#root');
editor.subscribe("focus", () => {
  console.log("Critique");

});
editor.subscribe("blur", () => {
  console.log("editor blur");
  console.log($("#root").html());

});
console.log(editor);
console.log("hello .world");

