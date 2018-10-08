const plugin = require('./parser');
const testStuff = {
  postData: {
    content: '[i][b][test=this argument here][/test][/b][/i]',
  },
};

plugin.parse(testStuff, _ => {
  console.log(testStuff.postData.content);
});