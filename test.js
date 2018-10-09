const plugin = require('./parser');
let testStuff = {
  postData: {
    content: '[i][b]\n\n[terrain]Grass[/terrain][/b][/i][hr]',
  },
};

plugin.processPost(testStuff, _ => {
  console.log(testStuff.postData.content);
});