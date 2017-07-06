// github issue comment
// Copyright (C) 2017
// Joseph Pan <http://github.com/wzpan>
// This library is free software; you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation; either version 2.1 of the
// License, or (at your option) any later version.
// 
// This library is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
// 02110-1301 USA
// 

'use strict';
var type, username, repo, client_id, client_secret, no_comment, go_to_comment, btn_class, comments_target, recent_comments_target, loading_target;
var github_addr = "https://github.com/";
var github_api_addr = "https://api.github.com/repos/";
var oschina_addr = "http://git.oschina.net/";
var oschina_api_addr = "http://git.oschina.net/api/v5/repos/";
var spinOpts = {
    lines: 13,
    length: 10,
    width: 6,
    radius: 12,
    corners: 1,
    rotate: 0,
    direction: 1,
    color: '#5882FA',
    speed: 1,
    trail: 60,
    shadow: false,
    hwaccel: false,
    className: 'spinner',
    zIndex: 2e9,
    top: 'auto',
    left: '50%'
};

var _getComment = function(params, callback) {
    let comments, comments_url, page;
    ({comments, comments_url, page} = params);
    // Get comments
    $.ajax({
        url: comments_url + '?page=' + page,
        dataType: 'json',
        cache: false,
        crossDomain: true,
        data: client_id && client_secret ? `client_id=${client_id}&client_secret=${client_secret}` : '',
        success: function (page_comments) {
            if (!page_comments || page_comments.length <= 0) {
                (callback && typeof(callback) === "function") && callback(comments);
                callback = null;
                return;
            }
            page_comments.forEach(function(comment){
                comments.push(comment);
            }) ;
            page += 1;
            params.comments = comments;
            params.page = page;
            _getComment(params, callback);
        },
        error: function(err) {
            (callback && typeof(callback) === "function") && callback(comments);
            callback = null;
        }
    });
}

var _getCommentsUrl = function(params, callback) {
    let issue_title, page;
    let found = false;
    ({issue_title, page} = params);
    let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
    $.ajax({
        url: api_addr + username + '/' + repo + '/issues?page=' + page,
        dataType: 'json',
        cache: false,
        crossDomain: true,
        data: client_id && client_secret ? `client_id=${client_id}&client_secret=${client_secret}` : '',
        success: function (issues) {
            if (!issues || issues.length <= 0) {
                (callback && typeof(callback) === "function") && callback("", "");
                callback = null;
                return;
            }
            issues.forEach(function(issue){
                // match title
                if (issue.title && issue.title == issue_title) {
                    (callback && typeof(callback) === "function") && callback(issue.comments_url, issue);
                    found = true;
                    callback = null;
                }
            });
            if (!found) {
                page += 1;
                params.page = page;
                _getCommentsUrl(params, callback);
            }
            return;
        },
        error: function() {
            (callback && typeof(callback) === "function") && callback("", "");
            callback = null;
        }
    });
}

var _getIssue = function(issue_id, callback) {
    let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
    let issue_url = api_addr + username + '/' + repo + '/issues/' + issue_id;
    _getIssueByUrl(issue_url, (issue)=>{
        (callback && typeof(callback) === "function") && callback(issue);
        callback = null;
    });
}

var _getIssueByUrl = function(issue_url, callback) {
    $.ajax({
        url: issue_url,
        dataType: 'json',
        cache: false,
        crossDomain: true,
        data: client_id && client_secret ? `client_id=${client_id}&client_secret=${client_secret}` : '',
        success: function (issues) {
            if (!issues || issues.length <= 0) {
                (callback && typeof(callback) === "function") && callback();
                callback = null;
                return;
            }
            let issue = issues;
            (callback && typeof(callback) === "function") && callback(issue);
            callback = null;
        },
        error: function() {
            (callback && typeof(callback) === "function") && callback();
            callback = null;
        }
    });
}

var _renderComment = function(comment) {
    var timeagoInstance = timeago();
    let user = comment.user;
    let content = markdown.toHTML(comment.body);
    let ago = timeagoInstance.format(comment.created_at);
    let current_user = user.login == username ? "current-user" : "";
    let addr = type == 'github' ? github_addr : oschina_addr;
    let owner = user.login == username ? `
        <span class="timeline-comment-label text-bold tooltipped tooltipped-multiline tooltipped-s" aria-label="${username} is the author of this blog.">
        Owner
    </span>
        ` : '';
    return `
        <div class="timeline-comment-wrapper js-comment-container">
        <div class="avatar-parent-child timeline-comment-avatar">
        <a href="${addr}${user.login}">
        <img alt="@${user.login}" class="avatar rounded-1" height="44" src="${user.avatar_url}&amp;s=88" width="44">
        </a>
        </div>
        <div id="issuecomment-310820108" class="comment previewable-edit js-comment js-task-list-container  timeline-comment js-reorderable-task-lists reorderable-task-lists ${current_user}" data-body-version="0ff4a390ed2be378bf5044aa6dc1510b">

        <div class="timeline-comment-header">
        ${owner}
        <h3 class="timeline-comment-header-text f5 text-normal">

        <strong>
        <a href="${addr}${user.login}" class="author">${user.login}</a>
        
    </strong>

    commented  

        <a href="#issuecomment-${comment.id}" class="timestamp"><relative-time datetime="${comment.created_at}" title="${comment.created_at}">${ago}</relative-time></a>

    </h3>
        </div>
        
        <table class="d-block">
        <tbody class="d-block">
        <tr class="d-block">
        <td class="d-block comment-body markdown-body js-comment-body">
        ${content}
    </td>
        </tr>
        </tbody>
        </table>
        </div>
        </div>
        `
}

var _renderRecentComment = function(user, title, content, time, url, callback) {
    let addr = type == 'github' ? github_addr : oschina_addr;
    let res = `
        <div class="comment-item">
          <div class="row comment-widget-head">
            <div class="xl-col-3 comment-widget-avatar">
              <a href="${addr}${user.login}">
                <img alt="@${user.login}" class="avatar rounded-1" height="44" src="${user.avatar_url}&amp;s=88" width="44">
              </a>
            </div>
            <div class="comment-widget-body">
              <span><a class="comment-widget-user" href="${addr}${user.login}" target="_blank">${user.login}</a> </span>
              <div class="comment-widget-content">${content}</div>
            </div>
          </div>
          <br/>
          <div class="comment-widget-meta">
            <span class="comment-widget-title">${title}</span> | <span class="comment-widget-date">${time}</span>
          </div>
        </div>
        `;
    (callback && typeof(callback) === "function") && callback(res);
    callback = null;
}

var _getRecentCommentList = function(comment_list, i, render_count, total_count, comments, callback) {
    if (render_count>=total_count || i>=comments.length) {
        (callback && typeof(callback) === "function") && callback(comment_list);
        callback = null;
        return;
    }
    let comment = comments[i];
    let content = markdown.toHTML(comment.body);
    let title = comment.title;
    let user = comment.user;
    var timeagoInstance = timeago();
    let time = timeagoInstance.format(comment.created_at);
    let url = comment.html_url;
    if (!content || content == '') {
        i++;
        _getRecentCommentList(comment_list, i, render_count, total_count, comments, callback);
        callback = null;
        return;
    }
    if (!title) {
        // Get title of issue
        _getIssueByUrl(comment.issue_url, (issue)=>{
            _renderRecentComment(user, issue.title, content, time, url, (item) => {
                comment_list += item;
                i++;
                render_count++;
                _getRecentCommentList(comment_list, i, render_count, total_count, comments, callback);
            });
        });
    } else {
        _renderRecentComment(user, title, content, time, url, (item) => {
            comment_list += item;
            i++;
            render_count++;
            _getRecentCommentList(comment_list, i, render_count, total_count, comments, callback);
        });
    }
}

var _renderRecentCommentList = function(comments, count) {
    let i = 0;
    let render_count = 0;
    let comment_list = '';
    _getRecentCommentList(comment_list, i, render_count, count, comments, (comment_list)=>{
        $(recent_comments_target).append(comment_list);
    })
}

var _renderHTML = function(params) {
    let issue, comments, comments_url, issue_title;
    ({issue, comments, comments_url, issue_title} = params);
    let addr = type == 'github' ? github_addr : oschina_addr;
    let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
    if ((!issue || !issue.body || issue.body == "") && (!comments || comments.length <= 0)) {
        let res = `
            <div class='js-discussion no-comment'>
            <span>${no_comment}</span>
            </div>
            `
        $(comments_target).append(res);
    } else {
        let res = `
            <div class="discussion-timeline js-quote-selection-container">
            <div class="js-discussion js-socket-channel">
            `
        if (issue && issue.body && issue.body != '') {
            res += _renderComment(issue);
        }
        comments.forEach(function(comment) {
            res += _renderComment(comment);
        });
        res += '</div></div>'
        $(comments_target).append(res);
    }
    let issue_url;
    if (!comments_url) {
        issue_url = `${addr}/${username}/${repo}/issues/new?title=${issue_title}#issue_body`;        
    } else {
        issue_url = comments_url.replace(api_addr, addr).replace('comments', '') + '#new_comment_field';
    }
    let res = `
        <p class="goto-comment">
        <a href="${issue_url}" class="${btn_class}" target="_blank">${go_to_comment}</a>
        </p>
        `
    $(comments_target).append(res);
}

var _getRecentIssues = function(params, callback) {
    let count;
    ({count} = params);
    let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
    $.ajax({
        url: api_addr + username + '/' + repo + '/issues\?per_page\=100',
        dataType: 'json',
        cache: false,
        crossDomain: true,
        data: client_id && client_secret ? `client_id=${client_id}&client_secret=${client_secret}` : '',
        success: function (issues) {
            if (issues.length > count) {
                issues = issues.sort('created_at').reverse().slice(0, 5);
            }
            (callback && typeof(callback) === "function") && callback(issues);
            callback = null;
        },
        error: function (err) {
            (callback && typeof(callback) === "function") && callback();
            callback = null;
        }
    });
}

var _getRecentComments = function(params, callback) {
    let count;
    ({count} = params);
    let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
    $.ajax({
        url: api_addr + username + '/' + repo + '/issues/comments\?per_page\=100',
        dataType: 'json',
        cache: false,
        crossDomain: true,
        data: client_id && client_secret ? `client_id=${client_id}&client_secret=${client_secret}` : '',
        success: function (comments) {
            if (comments.length > count) {
                comments = comments.sort('created_at').reverse().slice(0, 5);
            }
            
            (callback && typeof(callback) === "function") && callback(comments);
            callback = null;
        },
        error: function (err) {
            (callback && typeof(callback) === "function") && callback();
            callback = null;
        }
    });
}

var CompareDate = function(a, b) {
    let d1 = a['created_at'].replace('T', ' ').replace('Z', '').replace(/-/g,"\/");
    let d2 = b['created_at'].replace('T', ' ').replace('Z', '').replace(/-/g,"\/");
    return ((new Date(d1)) > (new Date(d2)));
}

var getRecentCommentsList = function(params) {
    let count, user;
    ({type, user, repo, client_id, client_secret, count, recent_comments_target} = params)
    username = user;
    recent_comments_target = recent_comments_target ? recent_comments_target : '#recent-comments';
    var recentList = new Array();
    // Get recent issues and comments and filter out 10 newest comments
    _getRecentIssues(params, (issues)=>{
        recentList = recentList.concat(issues);
        _getRecentComments(params, (comments)=>{
            recentList = recentList.concat(comments);
            recentList = recentList.sort(CompareDate).reverse();
            _renderRecentCommentList(recentList, count);
        });
    });
}

var getComments = function(params) {
    let issue_title, issue_id, user;
    ({type, user, repo, client_id, client_secret, no_comment, go_to_comment, issue_title, issue_id, btn_class, comments_target, loading_target} = params)
    comments_target = comments_target ? comments_target : '#comment-thread';
    username = user;
    var spinner = new Spinner(spinOpts);
    var timeagoInstance = timeago();
    var comments_url;
    var comments = new Array();
    type = type ? type : 'github';
    btn_class = btn_class ? btn_class : 'btn';
    
    loading_target && spinner.spin($("div"+loading_target).get(0));
    if (!issue_id || issue_id == 'undefined' || typeof(issue_id) == 'undefined') {
        _getCommentsUrl({issue_title: issue_title,
                         page: 1}, (comments_url, issue) => {
                             if (comments_url != '' && comments_url != undefined) {
                                 _getComment({comments: comments,
                                              comments_url: comments_url,
                                              page: 1},
                                              (comments) => {
                                                 loading_target && spinner.spin();
                                                 _renderHTML({
                                                     issue: issue,
                                                     comments: comments,
                                                     comments_url: comments_url,
                                                     issue_title: issue_title
                                                 }); 
                                                 return;
                                             });
                             } else {
                                 loading_target && spinner.spin();
                                 _renderHTML({
                                     issue: issue,
                                     comments: comments,
                                     comments_url: comments_url,
                                     issue_title: issue_title
                                 });
                                 return;
                             }
                         });
    } else {
        let api_addr = type == 'github' ? github_api_addr : oschina_api_addr;
        let comments_url = api_addr + username + '/' + repo + '/issues/' + issue_id + '/comments';
        _getIssue(issue_id, (issue) => {
            _getComment({comments: comments,
                         comments_url: comments_url,
                         page: 1},
                         (comments) => {
                            loading_target && spinner.spin();
                            _renderHTML({
                                issue: issue,
                                comments: comments,
                                comments_url: comments_url,
                                issue_title: issue_title
                            });
                            loading_target && spinner.spin();
                            return;
                        });
        })
    }
}


