(function(module) {
	"use strict";

	// Abstract BBCode Parser
	const BBCodeParser = function(postData, codes, method, callback) {
		this.postData = postData;
		this.string = postData.content;

		const STATE_NONE = 0;
		const STATE_TOKEN_ADD = 1;
		const STATE_TOKEN_REMOVE = 2;
		const STATE_TOKEN_PARAMETER = 3;
		const STATE_TOKEN_PARAMETER_MULTIPLE = 4;
		const STATE_CONTENT = 5;

		this.position = -1;
		this.state = STATE_CONTENT;
		this.storedPosition = 0;
		this.contentPosition = 0;

		this.bbcodes = codes;
		this.tokens = [];

		const Node = function(type) {
			this.type = type;
		};

		const Code = function(token) {
			this.type = 'code';
			this.token = token;
			this.children = [];
			this.closed = false;

			this.applyParameters = function(paramString) {
				this.parameters = {};
				const pairs = paramString.split(';');
				for (let i = 0; i < pairs.length; i++) {
					const tokens = pairs[i].split('=');
					this.parameters[tokens[0]] = tokens[1];
				}
			}

			this.applyParameter = function(paramString) {
				this.parameter = paramString;
			}

			this.getRawString = function() {
				if (this.parameter !== undefined) {
					return '[' + this.token + '=' + this.parameter + ']';
				} else if (this.parameters !== undefined) {
					const keys = Object.keys(this.parameters);
					let string = '[' + this.token + ':';
					for (let i = 0; i < keys.length; i++) {
						string += keys[i] + '=' + this.parameters[keys[i]];
						if (i != keys.length - 1) string += ';';
					}
					return string + ']';
				} else {
					return '[' + this.token + ']';
				}
			}

			this.getOwnStringRepresentation = function(value) {
				return this.getRawString() + (value !== undefined ? value : '') + '[/' + this.token + ']';
			}

			this.getString = function(codes, parent, data, callback) {
				const _this = this;
				let content = "";
				function processContent() {
					if (_this.closed === false) {
						callback(_this.getRawString() + content);
					} else {
						const bbCodeBuf = codes[_this.token];
						if (bbCodeBuf[method] !== undefined) {
							codes[_this.token][method]({
								node: _this,
								parent: parent,
								value: content,
								argument: _this.parameter !== undefined ? _this.parameter : _this.parameters,
								data: data
							}, function(result) {
								callback(result);
							});
						} else {
							callback(_this.getOwnStringRepresentation(content));
						}
					}
				}
				function iterateOverChildren(index) {
					_this.children[index].getString(codes, _this, data, function(buffer) {
						content += buffer;
						if (index + 1 < _this.children.length) {
							iterateOverChildren(index + 1);
						} else {
							processContent();
						}
					});
				}
				if (this.children.length > 0)
					iterateOverChildren(0);
				else 
					processContent();
			}
		}
		Code.prototype = Node;

		const Content = function(value) {
			this.type = 'string';
			this.value = value;

			this.getString = function(codes, parent, data, callback) {
				callback(this.value);
			}
		}
		Content.prototype = Node;

		const Root = function() {
			this.type = 'root';
			this.children = [];

			this.getString = function(codes, data, callback) {
				const _this = this;
				let content = "";
				function iterateOverChildren(index) {
					_this.children[index].getString(codes, _this, data, function(buffer) {
						content += buffer;
						if (index + 1 < _this.children.length) {
							iterateOverChildren(index + 1);
						} else {
							callback(content);
						}
					});
				}
				iterateOverChildren(0);
			}
		}
		Root.prototype = Node;

		this.cur = function() {
			return this.position < this.string.length ? this.string[this.position] : false;
		}

		this.next = function() {
			return this.position + 1 < this.string.length ? this.string[this.position + 1] : false;
		}

		this.token = function() {
			return this.string.substring(this.storedPosition, this.position);
		}

		this.content = function() {
			return this.string.substring(this.contentPosition, this.position);
		}

		this.pushContent = function() {
			const content = this.content();
			if (content.length > 0) {
				if (this.peekTop()) {
					this.peekTop().children.push(new Content(content));
				}
			}
		}

		this.peekTop = function() {
			return this.tokens.length > 0 ? this.tokens[0] : false;
		}

		this.popUntilMatched = function(token) {
      let i = 0;
			for (; i < this.tokens.length; i++) {
				if (this.tokens[i].token === token) break;
			}
			if (i < this.tokens.length) {
				while (this.tokens[0].token !== token) {
					const node = this.tokens.shift();
					if (this.bbcodes[node.token] !== undefined && this.bbcodes[node.token].singleTag === true)
						node.closed = true;
				}
				this.popTop();
				return true;
			}
			// Nothing matched, tag should be misspelled
			return false;
		}

		this.pushTop = function(element) {
			if (this.tokens.length > 0) {
				this.tokens[0].children.push(element);
			}
			this.tokens.unshift(element);
		}

		this.popTop = function() {
			this.tokens[0].closed = true;
			this.tokens.shift();
		}

		this.end = function() {
			return this.position >= this.string.length;
		}

		this.isParsingSuspended = function() {
			return (this.bbcodes[this.tokens[0].token] !== undefined && this.bbcodes[this.tokens[0].token].suspendParsing !== undefined) ?
				this.bbcodes[this.tokens[0].token].suspendParsing : false;
		}

		this.isSingleTag = function() {
			return (this.bbcodes[this.tokens[0].token] !== undefined && this.bbcodes[this.tokens[0].token].singleTag !== undefined) ?
				this.bbcodes[this.tokens[0].token].singleTag : false;
		}

		this.parse = function() {
			this.position = -1;
			this.storedPosition = 0;
			this.contentPosition = 0;
			this.state = STATE_CONTENT;
			this.pushTop(new Root());
			while (this.position < this.string.length) {
				this.position++;
				if (this.end()) {
					this.pushContent();
					continue;
				}
				if (this.state === STATE_CONTENT) {
					if (this.cur() === '[') {
						this.pushContent();
						this.contentPosition = this.position;
						if (this.next() === '/') {
							this.state = STATE_TOKEN_REMOVE;
							this.position++;
						} else {
							if (!this.isParsingSuspended())
								this.state = STATE_TOKEN_ADD;
						}
						this.storedPosition = this.position + 1;
						continue;
					} else {
						continue;
					}
				} else if (this.state === STATE_TOKEN_ADD) {
					if (this.cur() === '=') {
						const token = this.token();
						if (this.bbcodes[token] !== undefined) {
							if (this.isSingleTag() && this.tokens[0].token === token) {
								this.popTop();
							}
							this.pushTop(new Code(token));
							this.storedPosition = this.position + 1;
							this.state = STATE_TOKEN_PARAMETER;
							continue;
						} else {
							this.state = STATE_CONTENT;
							continue;
						}
					} else if (this.cur() === ':') {
						const token = this.token();
						if (this.bbcodes[token] !== undefined) {
							if (this.isSingleTag() && this.tokens[0].token === token) {
								this.popTop();
							}
							this.pushTop(new Code(token));
							this.storedPosition = this.position + 1;
							this.state = STATE_TOKEN_PARAMETER_MULTIPLE;
							continue;
						} else {
							this.state = STATE_CONTENT;
							continue;
						}	
					} else if (this.cur() === ']') {
						const token = this.token();
						if (this.bbcodes[token] !== undefined) {
							if (this.isSingleTag() && this.tokens[0].token === token) {
								this.popTop();
							}
							this.pushTop(new Code(token));
							this.contentPosition = this.position + 1;
							this.state = STATE_CONTENT;
							continue;
						} else {
							this.state = STATE_CONTENT;
							continue;
						}
					} else {
						continue;
					}
				} else if (this.state === STATE_TOKEN_PARAMETER) {
					if (this.cur() === ']') {
						const token = this.token();
						this.peekTop().applyParameter(token);
						this.contentPosition = this.position + 1;
						this.state = STATE_CONTENT;
						continue;
					} else {
						continue;
					}
				} else if (this.state === STATE_TOKEN_PARAMETER_MULTIPLE) {
					if (this.cur() === ']') {
						const token = this.token();
						this.peekTop().applyParameters(token);
						this.contentPosition = this.position + 1;
						this.state = STATE_CONTENT;
						continue;
					} else {
						continue;
					}
				} else if (this.state === STATE_TOKEN_REMOVE) {
					if (this.cur() === ']') {
						const token = this.token();
						if (this.isParsingSuspended()) {
							if (this.tokens[0].token === token) {
								this.popTop();
								this.contentPosition = this.position + 1;
								this.state = STATE_CONTENT;
								continue;
							} else {
								this.state = STATE_CONTENT;
								continue;
							}
						} else {
							if (this.popUntilMatched(token) === true) {
								this.contentPosition = this.position + 1;
								this.state = STATE_CONTENT;
								continue;
							} else {
								this.state = STATE_CONTENT;
								continue;
							}
						}
					} else {
						continue;
					}
				}
			}
			this.tokens[this.tokens.length - 1].getString(this.bbcodes, { postData: this.postData }, callback);
		}
	}

	const bbCodesTable = {
		"b": {
			apply: function(info, callback) {
				callback('<b>' + info.value + '</b>');
			}
		},
		"i": {
			apply: function(info, callback) {
				callback('<i>' + info.value + '</i>');
			}
		},
		"u": {
			apply: function(info, callback) {
				callback('<u>' + info.value + '</u>');
			}
		},
		"s": {
			apply: function(info, callback) {
				callback('<s>' + info.value + '</s>');
			}
		},
		"table": {
			apply: function(info, callback) {
				callback('<table>' + info.value + '</table>');
			}
		},
		"tr": {
			apply: function(info, callback) {
				callback('<tr>' + info.value + '</tr>');
			}
		},
		"td": {
			apply: function(info, callback) {
				callback('<td>' + info.value + '</td>');
			}
		},
		"size": {
			apply: function(info, callback) {
				callback('<font size="' + info.argument + '">' + info.value + '</font>');
			}
		},
		"font": {
			apply: function(info, callback) {
				callback('<span style="font-family:' + info.argument + '">' + info.value + '</span>');
			}
		},
		"center": {
			apply: function(info, callback) {
				callback('<p style="text-align:center">' + info.value + '</p>');
			}
		},
		"left": {
			apply: function(info, callback) {
				callback('<p style="text-align:left">' + info.value + '</p>');
			}
		},
		"right": {
			apply: function(info, callback) {
				callback('<p style="text-align:right">' + info.value + '</p>');
			}
		},
		"link": {
			apply: function(info, callback) {
				callback('<a href="' + info.argument + '">' + (typeof info.argument !== 'string' ? info.argument : info.value) + '</a>');
			}
		},
		"url": {
        apply: function (info, callback) {
            callback('<a href="' + info.argument + '">' + (typeof info.argument !== 'string' ? info.argument : info.value) + '</a>');
        }
    },
		"img": {
			apply: function(info, callback) {
				callback('<img style="max-width: 100%;" src="' + info.value + '"></img>');
			}
		},
		"color": {
			apply: function(info, callback) {
				callback('<font color="' + info.argument + '">' + info.value + '</font>');
			}
		},
		"code": {
			suspendParsing: true,
			apply: function(info, callback) {
				callback('<code>' + info.value + '</code>');
			}
		},
		"list": {
			apply: function(info, callback) {
				if (info.argument === "1") {
					callback('<ol>' + info.value + '</ol>');
				} else
					callback('<ul>' + info.value + '</ul>');
			}
		},
		/* "video": {
			apply: function(info, callback) {
				callback('<div><iframe frameborder="0" id="ytplayer" type="text/html" width="640" height="390" src="http://www.youtube.com/embed/' + info.value + '"></iframe></div>');
			}
		}, */
		"*": {
			apply: function(info, callback) {
				if (info.parent.token === "list") {
					callback('<li>' + info.value + '</li>');
				}
			}
		},
		"test": {
      singleTag: true,
			apply: function(info, callback) {
        callback(`<div class="test">${info.argument}</div>`);
			}
		},
		"quote": {
			apply: function(info, callback) {
				callback((info.argument !== undefined ? "<p>@" + info.argument + " said: </p>" : "") + "<blockquote>" + info.value + "</blockquote>");
			}
		},
		/* "spoiler": {
			apply: function(info, callback) {
				var jadeFn = jade.compileFile('node_modules/nodebb-plugin-bbcodes/templates/jade/spoiler.tpl', {});
				callback(jadeFn({ value: info.value, argument : (info.argument != undefined ? info.argument : "Spoiler") }));
			}
		}, */
  };

  const baseRegex = (str) => new RegExp(`\\[${str}(?:=([^\\],]+))(?:,([^\\]]))?\\]`, 'g');

	const winston = require('winston'),
		// meta = module.parent.require('./meta'),
		// plugins = module.parent.require('./plugins'),
		// jade = require('jade'),
		// db = module.parent.require('./database'),
		async = require('async'),
		

		sanitize = true;

	function checkCompatibility(callback) {
		async.parallel({
			active: async.apply(plugins.getActive),
			markdown: async.apply(meta.settings.get, 'markdown')
		}, function(err, data) {
			callback(null, {
				markdown: data.active.indexOf('nodebb-plugin-markdown') === -1 || data.markdown.html === 'on',
				//			^ plugin disabled										^ HTML sanitization disabled
				composer: data.active.filter(function(plugin) {
					return plugin.startsWith('nodebb-plugin-composer');
				}).length === 0
			})
		});
	};

	/* ============================================ */
	/* ============================================ */
	/* ============================================ */

	// plugins.fireHook('filter:post.save', postData, next);
	module.exports.onPostSave = function(postData, next) {
		// Parse dynamic tags and store ID's in the tag
		new BBCodeParser(postData, bbCodesTable, 'save', function(result) {
			postData.content = result;
			next(null, postData);
		}).parse();
	};

	// plugins.fireHook('filter:post.getFields', {posts: [data], fields: fields}, next)
	module.exports.onPostGetFields = function(data, next) {
		// Check if stored ID's changes and perform cleanup if needed
		// Let's try to detect composer's request. 
		// This is fcking hook but we will watch for fields=[content, tid, uid, handle]
		// Assuming that this request is from composer
		if (data.fields.indexOf("content") >= 0
			&& data.fields.indexOf("tid") >= 0
			&& data.fields.indexOf("tid") >= 0
			&& data.fields.indexOf("handle") >= 0) {
			new BBCodeParser(data.posts[0], bbCodesTable, 'get', function(result) {
				data.posts[0].content = result;
				next(null, data);
			}).parse();
		} else {
			next(null, data);
		}
	};

	module.exports.parse = function(data, callback) {
		if (!data || !data.postData || !data.postData.content) {
			return callback(null, data);
		}
		if (sanitize) {
			data.postData.content = data.postData.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
		}

		new BBCodeParser(data.postData, bbCodesTable, 'apply', function(result) {
			data.postData.content = result;
			callback(null, data);
		}).parse();
		
	};

	function adminPanelController(req, res, next) {
		checkCompatibility(function(err, checks) {
			res.render('bbcodes-admin', {
				checks: checks
			});
		});
	};
	
	module.exports.load = function(app, next) {
		// Fire hook to collect extensions
		plugins.fireHook('static:plugin-bbcodes-load', { codeTable: bbCodesTable });
		// Bind admin panel url
		app.router.get('/admin/plugins/bbcodes', app.middleware.admin.buildHeader, adminPanelController);
		app.router.get('/api/admin/plugins/bbcodes', adminPanelController);

		meta.configs.getFields(['bbcodes-sanitize'], function(err, config) {
			if (config && config["bbcodes-sanitize"]) {
				if (config["bbcodes-sanitize"] === '0') {
					sanitize = false;
				}
			} else {
				meta.configs.set('bbcodes-sanitize', '1');
			}
			winston.verbose("BBCode plugin loaded");
			next(null);
		});
	};

	module.exports.extendAdminMenu = function(header, next) {
		header.plugins.push({
			"route": '/plugins/bbcodes',
			"icon": 'fa-bold',
			"name": 'BBCodes'
		});
		next(null, header);
	};
}(module));
