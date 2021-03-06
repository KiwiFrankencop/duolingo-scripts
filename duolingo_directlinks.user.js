// ==UserScript==
// @name           DuoDirectLinks
// @namespace      https://github.com/liuch/duolingo-scripts
// @include        https://www.duolingo.com/*
// @version        0.3.13
// @grant          none
// @description    This script adds the direct links for discussion comments, translation sentences, and activity stream events
// @description:ru Этот скрипт добавляет прямые ссылки на комментария в форумах, на предложения в переводах и на события в ленте
// @updateURL      https://github.com/liuch/duolingo-scripts/raw/master/duolingo_directlinks.meta.js
// @downloadURL    https://github.com/liuch/duolingo-scripts/raw/master/duolingo_directlinks.user.js
// @author         FieryCat aka liuch
// @license        MIT License
// ==/UserScript==

function inject(f) { //Inject the script into the document
	var script;
	script = document.createElement('script');
	script.type = 'text/javascript';
	script.setAttribute('name', 'duodirectlinks');
	script.textContent = '(' + f.toString() + ')(jQuery)';
	document.head.appendChild(script);
}
inject(f);

function f($) {
	var trs = {
		"Direct link" : {
			"ru" : "Прямая ссылка",
			"uk" : "Пряме посилання"
		}
	}
	function tr(t) {
		if (duo.user !== undefined && duo.user.attributes.ui_language !== undefined && trs[t] !== undefined && trs[t][duo.user.attributes.ui_language] != undefined)
			return trs[t][duo.user.attributes.ui_language];
		return t;
	}

	function makeEventLink(j) {
		if (j["id"] !== undefined) {
			var h = $("#comment-box-" + j.id).parents(".stream-item").children(".stream-item-header");
			if (h.length && !h.find(".icon-link").length)
				h.prepend('<a class="left" style="margin-right:5px;" href="/event/' + j.id + '"><span class="icon icon-link" /></a>');
		}
	}

	function makeDiscussionLink(h, id) {
		var el = $(".discussion-main").find("h1:first");
		if (el.length && !el.find(".icon-link").length) {
			var e2 = $('<a style="margin-right:5px;" href="javascript:;"><span class="icon icon-link" /></a>');
			e2.click(function() {
				var e = $("#md-link");
				if (!e.is(":visible")) {
					e.show().focus().select();
				} else
					e.hide();
			});
			el.prepend(e2);
			var t = el.text().trim().replace("[", "\\[").replace("]", "\\]");
			if (!t.length)
				t = "here";
			t = "[" + t + "](" + h.replace("(", "\\(").replace(")", "\\)") + "/comment/" + id + ")";
			e2 = $('<input type="text" id="md-link" class="large" style="width:100%" readonly="readonly" />').attr("value", t).hide();
			el.after(e2);
		}
	}
	function makeCommentLink(id, j) {
		var n_id = j.id;
		var el = $("#nested-comment-" + n_id).children("span").children("header");
		if (el.length && !el.find(".icon-link").length) {
			var l = "/comment/" + id + "$comment_id=" + n_id;
			el.prepend('<a style="margin-right:5px;" href="' + l + '"><span class="icon icon-link" /></a>');
		}
	}
	function markComment(id) {
		$("#comment-" + id).css("list-style", "outside");
	}
	var processNestedComments = function(id, j) {
		if (j["comments"] !== undefined && j.comments.length) {
			for (var i in j.comments) {
				makeCommentLink(id, j.comments[i]);
				processNestedComments(id, j.comments[i]);
			}
		}
	};
	var last_root_comment_id = null;
	var last_article_id = "";
	var act_reg = null;
	var tr_doc_reg = null, tr_sen_reg = null, tr_rep_reg = null, tr_art_reg = null, tr_sen_idx = null;
	var ds_sub_reg = null, ds_sen_reg = null, ds_trn_reg = null, ds_lnk_reg = null, ds_mrk_reg = null;

	function start(e, r, o) {
		if (!duo)
			return;
		if (o.url == "/diagnostics/js_error")
			return;

		// Activity links
		if (!act_reg)
			act_reg = new RegExp("^/(activity|stream|events)/[0-9]+(\\?|/like$)");
		var a = act_reg.exec(o.url);
		if (!a && o.url == "/post")
			a = [o.url, o.url.substr(1)];
		if (a) {
			var j = $.parseJSON(r.responseText);
			if (j) {
				if (a[1] == "events" || a[1] == "post") {
					makeEventLink(j);
				} else if (j["events"] !== undefined) {
					for (var i = 0; i < j.events.length; ++i)
						makeEventLink(j.events[i]);
				}
			}
			return;
		}

		// Translation links
		if (!tr_sen_reg) {
			tr_doc_reg = new RegExp("^/wiki_translations/([a-z0-9]+)($|\\?)");
			tr_sen_reg = new RegExp("^/wiki_translation_sentence/[a-z0-9]+/[a-z0-9]+/(get_sentence|get_revisions|[a-z0-9]+/rate)");
			tr_rep_reg = new RegExp("^/wiki_translations/report_translator_cheating/[0-9]+$");
			tr_art_reg = new RegExp("^/translation/([a-z0-9]+)($|\\$.*)");
			tr_sen_idx = new RegExp("[\\$&]index=([1-9][0-9]*)");
		}
		if (tr_doc_reg.exec(o.url)) {
			last_article_id = "";
			return;
		}
		if (tr_sen_reg.exec(o.url) || tr_rep_reg.exec(o.url)) {
			var id = tr_art_reg.exec(document.location.pathname);
			if (id) {
				var sen_idx = id[2];
				id = id[1];
				if (id != last_article_id) {
					sen_idx = sen_idx && tr_sen_idx.exec(sen_idx);
					if (sen_idx)
						$("html, body").animate({scrollTop: $("#sentence-" + sen_idx[1]).offset().top - 250}, 1000);
					last_article_id = id;
				}
				var el = $(".document-sentence-sidebar :visible");
				if (el.length) {
					el = el.find(".report-translator-cheating-wrapper").eq(0);
					if (!el.length)
						el = $(".wiki-textarea-container").eq(0)
					if (el.length && !el.find(".icon-link").length) {
						var idx = el.parent().parent().parent().attr("id").replace("sentence-sidebar-", "");
						el.append('<a class="right" style="clear:right;" href="/translation/' + id + '$index=' + idx + '"><span class="icon icon-link" style="margin-right:5px;" />' + tr('Direct link') + '</a>');
					}
				}
			}
			return;
		}

		// Discussion links
		if (!ds_sub_reg) {
			ds_sub_reg = new RegExp("^(https://forum.duolingo.com)?/comments/[0-9]+($|\\?|/reply|/upvote|/downvote|/love)");
			ds_sen_reg = new RegExp("^/sentence/[0-9a-f]+\\?");
			ds_trn_reg = new RegExp("^/translation/[0-9a-f]+($|\\$)");
			ds_lnk_reg = new RegExp("^/comment/([0-9]+)($|\\$)");
			ds_mrk_reg = new RegExp("[\\$&]comment_id=([0-9]+)($|&)");
		}
		var modal = false;
		a = ds_sub_reg.exec(o.url);
		if (!a) {
			a = ds_sen_reg.exec(o.url);
			modal = true;
		}
		if (a) {
			var j = $.parseJSON(r.responseText);
			if (j) {
				var id = null;
				var practice = (document.location.pathname == "/practice");
				if (!modal) {
					if (!practice) {
						id = ds_lnk_reg.exec(document.location.pathname);
						if (id) {
							if (id[2] != "") {
								var ci = ds_mrk_reg.exec(document.location.pathname);
								if (ci)
									markComment(ci[1])
							}
							id = id[1];
						} else {
							id = ds_trn_reg.exec(document.location.pathname);
							if (id)
								id = j.id
						}
					} else
						id = last_root_comment_id;
				} else if (document.location.pathname == "/practice" || document.location.pathname.startsWith("/skill/")) {
					if (j.comment) {
						j = j.comment;
						id = j.id;
					}
				}
				last_root_comment_id = id;
				if (id) {
					if (!modal && (a[2] == "/upvote" || a[2] == "/downvote" || a[2] == "/reply"))
						makeCommentLink(id, j);
					else if (!modal && (o.type == "PUT" || a[2] == "/love"))
						j = {comments: [j]};
					processNestedComments(id, j);
					makeDiscussionLink(document.location.protocol + "//" + document.location.host, id);
				}
			}
		}
	}

	$(document).ajaxComplete(function(e, r, o) {
		start(e, r, o);
	});
}

