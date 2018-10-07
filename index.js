// @ts-check

const Parser = require('ya-bbcode');
const async = require('async');
let parser;

const BBCode = {
  config: {},
  onLoad: (params, callback) => {
    function render(_, res) {
			res.render('admin/plugins/markdown', {});
    }

		params.router.get('/admin/plugins/markdown', params.middleware.admin.buildHeader, render);
    params.router.get('/api/admin/plugins/markdown', render);
    
    BBCode.init();

    callback();
  },

  init: () => {
    parser = new Parser();

    parser.registerTag('spoiler', {
      type: 'replace',
      open: (attr) => {
        return `<div class="yabbcode-spoiler">${attr || 'Spoiler'}</div><div>`
      },
      close: '</div>'
    });
  },

  parsePost: (data, callback) => {
		async.waterfall([
			function (next) {
				if (data && data.postData && data.postData.content && parser) {
					data.postData.content = parser.render(data.postData.content);
				}
				next(null, data);
			},
			async.apply(BBCode.postParse),
		], callback);
  },

  parseSignature: (data, callback) => {
		async.waterfall([
			function (next) {
				if (data && data.userData && data.userData.signature && parser) {
					data.userData.signature = parser.render(data.userData.signature);
				}
				next(null, data);
			},
			async.apply(BBCode.postParse),
		], callback);
  },

  parseAboutMe: (aboutme, callback) => {
		async.waterfall([
			function (next) {
				aboutme = (aboutme && parser) ? parser.render(aboutme) : aboutme;
				process.nextTick(next, null, aboutme);
			},
			async.apply(BBCode.postParse),
		], callback);
  },

  parseRaw: (raw, callback) => {
		async.waterfall([
			function (next) {
				raw = (raw && parser) ? parser.render(raw) : raw;
				process.nextTick(next, null, raw);
			},
			async.apply(BBCode.postParse),
		], callback);
  },

	postParse: function (payload, next) {
		const execute = (html) => {
      // any post-processing here
			return html;
		};

		if (payload.hasOwnProperty('postData')) {
			payload.postData.content = execute(payload.postData.content);
		} else if (payload.hasOwnProperty('userData')) {
			payload.userData.signature = execute(payload.userData.signature);
		} else {
			payload = execute(payload);
		}

		next(null, payload);
	},

	admin: {
		menu: (customHeader, callback) => {
			customHeader.plugins.push({
				route: '/plugins/rern-bbcode',
				icon: 'fa-edit',
				name: 'RERN BBCode',
			});

			callback(null, customHeader);
		},
	},
}