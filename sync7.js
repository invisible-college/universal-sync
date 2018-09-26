
var sync7 = (typeof(module) != 'undefined') ? module.exports : {}
;(function () {

    sync7.version = 1001
    sync7.port = 40704
    
    // var client = sync7.create_client({
    //     ws_url : 'ws://invisible.college:' + sync7.port,
    //     channel : 'the_cool_room',
    //     get_text : function () {
    //         return current_text_displayed_to_user
    //     },
    //     get_range : function () {
    //         return [selection_start, selection_end]
    //     },
    //     on_text : function (text, range) {
    //         current_text_displayed_to_user = text
    //         set_selection(range[0], range[1])
    //     }
    // })
    //
    // client.on_change() <-- call this when the user changes the text or cursor/selection position
    //
    sync7.create_client = function (options) {
        var self = {}
        self.on_change = null
        self.on_window_closing = null
        self.get_channels = null
    
        var on_channels = null
    
        var uid = guid()
        var s7 = sync7.create()
        var unacknowledged_commits = {}

        window.addEventListener('beforeunload', function () {
            if (self.on_window_closing) self.on_window_closing()
        })
    
        var connected = false
        function reconnect() {
            connected = false
            console.log('connecting...')
            var ws = new WebSocket(options.ws_url)
    
            function send(o) {
                o.v = sync7.version
                o.uid = uid
                o.channel = options.channel
                try {
                    ws.send(JSON.stringify(o))
                } catch (e) {}
            }
    
            self.on_window_closing = function () {
                send({ close : true })
            }
    
            self.get_channels = function (cb) {
                on_channels = cb
                send({ get_channels : true })
            }
        
            ws.onopen = function () {
                connected = true
                send({ join : true })
                on_pong()
            }
        
            var pong_timer = null
            function on_pong() {
                clearTimeout(pong_timer)
                setTimeout(function () {
                    send({ ping : true })
                    pong_timer = setTimeout(function () {
                        console.log('no pong came!!')
                        if (ws) {
                            ws = null
                            reconnect()
                        }
                    }, 4000)
                }, 3000)
            }
    
            ws.onclose = function () {
                console.log('connection closed...')
                if (ws) {
                    ws = null
                    reconnect()
                }
            }
    
            var sent_unacknowledged_commits = false

            ws.onmessage = function (event) {
                if (!ws) { return }
                var o = JSON.parse(event.data)
                if (o.pong) {
                    on_pong()
                } else {
                    console.log('message: ' + event.data)
                }
                if (o.channels) {
                    if (on_channels) on_channels(o.channels)
                }
                if (o.commits) {
                    self.on_change()
                    var new_range = sync7.merge(s7, o.commits, options.get_range())
                    options.on_text(s7.text, new_range)
    
                    if (o.welcome) {
                        each(sync7_get_ancestors(s7, o.commits, true), function (_, id) {
                            delete unacknowledged_commits[id]
                        })
                        if (Object.keys(unacknowledged_commits).length > 0) {
                            send({ commits : unacknowledged_commits })
                        }
                        sent_unacknowledged_commits = true
                    }
                    send({ leaves : s7.real_leaves })
                }
            }
    
            self.on_change = function () {
                if (!connected) { return }
                
                var cs = sync7.commit(s7, options.get_text())
                
                if (cs) Object.assign(unacknowledged_commits, cs)
                if (!sent_unacknowledged_commits) { return }
                if (cs) send({ commits : cs })
            }
        }
        reconnect()
    
        return self
    }

    // options is an object like this: {
    //     wss : a websocket server from the 'ws' module,
    // }
    //
    sync7.create_server = function (options) {
        var self = {}
        self.channels = {}
    
        function new_channel(name) {
            return self.channels[name] = {
                name : name,
                s7 : sync7.create(),
                members : {}
            }
        }
        function get_channel(name) {
            return self.channels[name] || new_channel(name)
        }
    
        var users_to_sockets = {}

        options.wss.on('connection', function connection(ws) {
            console.log('new connection')
            var uid = null
            var channel_name = null
    
            function myClose() {
                if (!uid) { return }
                delete users_to_sockets[uid]
                each(users_to_sockets, function (_ws, _uid) {
                    try {
                        _ws.send(JSON.stringify({
                            v : sync7.version,
                            uid : uid,
                            channel : channel_name,
                            close : true
                        }))
                    } catch (e) {}
                })
            }
    
            ws.on('close', myClose)
            ws.on('error', myClose)
            
            function try_send(ws, message) {
                try {
                    ws.send(message)
                } catch (e) {}
            }
    
            ws.on('message', function (message) {
                var o = JSON.parse(message)
                if (o.v != sync7.version) { return }
                if (o.ping) { return try_send(ws, JSON.stringify({ pong : true })) }
    
                console.log('message: ' + message)
    
                uid = o.uid
                var channel = get_channel(o.channel)
                channel_name = channel.name
                users_to_sockets[uid] = ws
                
                if (!channel.members[uid]) channel.members[uid] = { last_sent : 0 }
                channel.members[uid].last_seen = Date.now()

                function send_to_all_but_me(message) {
                    each(channel.members, function (_, them) {
                        if (them != uid) {
                            try_send(users_to_sockets[them], message)
                        }
                    })
                }
    
                if (o.get_channels) {
                    try_send(ws, JSON.stringify({ channels : Object.keys(self.channels) }))
                }
                if (o.join) {
                    try_send(ws, JSON.stringify({ commits : channel.s7.commits, welcome : true }))
                }
                if (o.commits) {
                    var new_commits = {}
                    each(o.commits, function (c, id) {
                        if (!channel.s7.commits[id]) {
                            new_commits[id] = c
                        }
                    })
                    sync7.merge(channel.s7, new_commits)

                    var new_message = {
                        channel : channel.name,
                        commits : new_commits
                    }
                    new_message = JSON.stringify(new_message)
    
                    var now = Date.now()
                    each(channel.members, function (m, them) {
                        if (them != uid) {
                            if (m.last_seen > m.last_sent) {
                                m.last_sent = now
                            } else if (m.last_sent < now - 3000) {
                                return
                            }
                            try_send(users_to_sockets[them], new_message)
                        }
                    })
                }
                if (o.close) {
                    delete channel.members[uid]
                }
            })
        })
    
        return self
    }

    sync7.create = function () {
        return {
            commits : {
                'root' : { to_parents : {}, from_kids : {} }
            },
            temp_commits : {},
            real_leaves : ['root'],
            leaf : 'root',
            text : ''
        }
    }

    sync7.commit = function (s7, s) {
        if (s == s7.text) { return }
        
        var cs = s7.temp_commits
        s7.temp_commits = {}
    
        var id = guid()
        var to_parents = {}
        s7.commits[s7.leaf].from_kids[id] = to_parents[s7.leaf] = sync7_diff(s, s7.text)
        s7.commits[id] = cs[id] = { to_parents : to_parents, from_kids : {} }
        s7.leaf = id
        s7.real_leaves = [id]
        
        s7.text = s
        return cs
    }

    sync7.merge = function (s7, cs, cursors, custom_merge_func) {
        if (!cursors) cursors = {}
        if (!custom_merge_func) custom_merge_func = default_custom_merge_func
        var projected_cursors = cursors.map(function (cursor) {
            var node = s7.leaf
            while (s7.temp_commits[node]) {
                var old_node = node
                each(s7.commits[node].to_parents, function (d, p) {
                    var offset = 0
                    var poffset = 0
                    each(d, function (d) {
                        if (typeof(d) == 'number') {
                            if (cursor <= offset + d) {
                                cursor = cursor - offset + poffset
                                node = p
                                return false
                            }
                            offset += d
                            poffset += d
                        } else {
                            offset += d[0].length
                            poffset += d[1].length
                        }
                    })
                    if (old_node != node) return false
                })
                if (old_node == node) throw 'failed to project cursor up'
            }
            return [cursor, node]
        })

        each(cs, function (c, id) {
            s7.commits[id] = c
            each(c.to_parents, function (d, p) {
                if (!cs[p] && s7.commits[p]) {
                    s7.commits[p].from_kids[id] = d
                }
            })
        })
        s7.real_leaves = sync7_get_leaves(s7.commits, s7.temp_commits)
        var leaves = Object.keys(s7.real_leaves).sort()
        
        var texts = {}
        each(leaves, function (leaf) {
            texts[leaf] = sync7_get_text(s7, leaf)
        })
    
        each(s7.temp_commits, function (c, k) {
            each(c.to_parents, function (d, p) {
                if (!s7.temp_commits[p]) {
                    delete s7.commits[p].from_kids[k]
                }
            })
            delete s7.commits[k]
        })
        s7.temp_commits = {}
        
        var prev_merge_node = leaves[0]
        var ancestors = sync7_get_ancestors(s7, prev_merge_node)
        for (var i = 1; i < leaves.length; i++) {
            var leaf = leaves[i]
            var i_ancestors = sync7_get_ancestors(s7, leaf)
            var CAs = sync7_intersection(ancestors, i_ancestors)
            var LCAs = sync7_get_leaves(CAs)
            each(i_ancestors, function (v, k) {
                ancestors[k] = v
            })
            
            function get_nodes_on_path_to_LCAs(node) {
                var agg = {}
                function helper(x) {
                    var hit_LCA = LCAs[x]
                    if (!CAs[x]) {
                        each(s7.commits[x].to_parents, function (d, p) {
                            hit_LCA = helper(p) || hit_LCA
                        })
                    }
                    if (hit_LCA) {
                        agg[x] = true
                        return true
                    }
                }
                helper(node)
                return agg
            }
    
            function calc_dividers_and_such_for_node(node, nodes_on_path_to_LCAs, dividers, untouched_regions_for_node) {
                untouched_regions_for_node[node] = [[0, texts[node].length, 0]]
                function helper(node) {
                    if (untouched_regions_for_node[node]) return untouched_regions_for_node[node]
                    var pur = {}
                    each(s7.commits[node].from_kids, function (d, k) {
                        if (!nodes_on_path_to_LCAs[k]) { return }
                        var untouched = helper(k)
                        
                        var ui = 0
                        var uo = 0
                        var offset = 0
                        var poffset = 0
                        each(d, function (r) {
                            var end_point = offset + ((typeof(r) == 'number') ? r : r[0].length)
                            while (untouched[ui] && end_point >= untouched[ui][2] + untouched[ui][1]) {
                                if (typeof(r) == 'number') {
                                    var x = untouched[ui][2] + uo - offset + poffset
                                    pur[x] = [untouched[ui][0] + uo, untouched[ui][1] - uo, x]
                                }
                                ui++
                                uo = 0
                            }
                            if (!untouched[ui]) { return false }
                            if (end_point > untouched[ui][2] + uo) {
                                if (typeof(r) == 'number') {
                                    var x = untouched[ui][2] + uo - offset + poffset
                                    pur[x] = [untouched[ui][0] + uo, end_point - (untouched[ui][2] + uo), x]
                                }
                                uo = end_point - untouched[ui][2]
                                dividers[untouched[ui][0] + uo] = untouched[ui][0] + uo
                            }
                            offset = end_point
                            poffset += (typeof(r) == 'number') ? r : r[1].length
                        })
                    })
                    return untouched_regions_for_node[node] = Object.values(pur).sort(function (a, b) { return a[2] - b[2] })
                }
                each(LCAs, function (_, lca) { helper(lca) })
            }
    
            var prev_nodes_on_path_to_LCAs = get_nodes_on_path_to_LCAs(prev_merge_node)
            var prev_dividers = {}
            var prev_untouched_regions_for_node = {}
            calc_dividers_and_such_for_node(prev_merge_node, prev_nodes_on_path_to_LCAs, prev_dividers, prev_untouched_regions_for_node)
    
            var leaf_nodes_on_path_to_LCAs = get_nodes_on_path_to_LCAs(leaf)
            var leaf_dividers = {}
            var leaf_untouched_regions_for_node = {}
            calc_dividers_and_such_for_node(leaf, leaf_nodes_on_path_to_LCAs, leaf_dividers, leaf_untouched_regions_for_node)
            
            each(LCAs, function (_, lca) {
                function do_one_against_the_other(a, b, dividers) {
                    var bb, bi = 0
                    each(a, function (aa) {
                        while ((bb = b[bi]) && (bb[2] + bb[1] <= aa[2])) bi++
                        if (bb && bb[2] < aa[2]) {
                            var x = aa[2] - bb[2] + bb[0]
                            dividers[x] = x
                        }
                        while ((bb = b[bi]) && (bb[2] + bb[1] <= aa[2] + aa[1])) bi++
                        if (bb && bb[2] < aa[2] + aa[1]) {
                            var x = aa[2] + aa[1] - bb[2] + bb[0]
                            dividers[x] = x
                        }
                    })
                }
                
                var a = prev_untouched_regions_for_node[lca]
                var b = leaf_untouched_regions_for_node[lca]
                do_one_against_the_other(a, b, leaf_dividers)
                do_one_against_the_other(b, a, prev_dividers)
            })
            
            function calc_endpoints(dividers, node) {
                var endpoints = []
                endpoints.push([0, 0, 0])
                each(Object.values(dividers).sort(function (a, b) { return a - b }), function (offset) {
                    endpoints.push([offset, 1, offset])
                    endpoints.push([offset, 0, offset])
                })
                endpoints.push([texts[node].length, 1, texts[node].length])
                
                return endpoints
            }
            
            var prev_endpoints = calc_endpoints(prev_dividers, prev_merge_node)
            var leaf_endpoints = calc_endpoints(leaf_dividers, leaf)
    
            function project_endpoints_to_LCAs(endpoints, node, nodes_on_path_to_LCAs) {
                var endpoints_for_node = {}
                endpoints_for_node[node] = endpoints
    
                function helper(node) {
                    if (endpoints_for_node[node]) return endpoints_for_node[node]
                    var agg = {}
                    function add_to_agg(endpoint, projected_pos) {
                        var key = '[' + endpoint[0] + ',' + endpoint[1] + ']'
                        if (endpoint[1] == 0)
                            agg[key] = Math.min(agg[key] || Infinity, projected_pos)
                        else
                            agg[key] = Math.max(agg[key] || -Infinity, projected_pos)
                    }
                    each(s7.commits[node].from_kids, function (d, k) {
                        if (!nodes_on_path_to_LCAs[k]) { return }
                        
                        var endpoints = helper(k)
                        var ei = 0
                        
                        var offset = 0
                        var poffset = 0
                        each(d, function (d) {
                            var end = offset + ((typeof(d) == 'number') ? d : d[0].length)
                            while (endpoints[ei] && (endpoints[ei][2] < end || (endpoints[ei][1] == 1 && endpoints[ei][2] <= end))) {
                                if (typeof(d) == 'number') {
                                    add_to_agg(endpoints[ei], endpoints[ei][2] - offset + poffset)
                                } else if (endpoints[ei][1] == 0) {
                                    add_to_agg(endpoints[ei], poffset)
                                } else {
                                    add_to_agg(endpoints[ei], poffset + d[1].length)
                                }
                                ei++
                            }
                            offset = end
                            poffset += (typeof(d) == 'number') ? d : d[1].length
                        })
                        while (endpoints[ei]) {
                            add_to_agg(endpoints[ei], poffset)
                            ei++
                        }
                    })
                    
                    var endpoints = []
                    each(agg, function (v, k) {
                        var kk = eval(k)
                        endpoints.push([kk[0], kk[1], v])
                    })
                    
                    return endpoints_for_node[node] = endpoints.sort(function (a, b) {
                        if (a[2] != b[2])
                            return a[2] - b[2]
                        return b[1] - a[1]
                    })
                }
    
                var regions_for_node = {}
    
                var lookup_by_begin = {}
                var lookup_by_end = {}
                var base_regions = []
                regions_for_node[node] = base_regions
                for (var i = 0; i < endpoints.length; i += 2) {
                    var e0 = endpoints[i][0]
                    var e1 = endpoints[i + 1][0]
                    base_regions.push([e0, e1 - e0])
                    lookup_by_begin[e0] = base_regions.length - 1
                    lookup_by_end[e1] = base_regions.length - 1
                }
                
                each(LCAs, function (_, lca) {
                    var endpoints = helper(lca)
                    var regions = []
                    regions_for_node[lca] = regions
                    each(endpoints, function (e) {
                        if (e[1] == 0) {
                            var i = lookup_by_begin[e[0]];
                            (regions[i] = regions[i] || [])[0] = e[2]
                        } else {
                            var i = lookup_by_end[e[0]];
                            (regions[i] = regions[i] || [])[1] = e[2]
                        }
                    })
                    each(regions, function (r) {
                        r[1] = r[1] - r[0]
                    })
                })
    
                return regions_for_node
            }
            
            var prev_regions_per_node = project_endpoints_to_LCAs(prev_endpoints, prev_merge_node, prev_nodes_on_path_to_LCAs)
            var leaf_regions_per_node = project_endpoints_to_LCAs(leaf_endpoints, leaf, leaf_nodes_on_path_to_LCAs)
            
            var prev_regions = prev_regions_per_node[prev_merge_node]
            var leaf_regions = leaf_regions_per_node[leaf]
    
            var prev_untouched_regions_for_LCA_by_position = {}
            var leaf_untouched_regions_for_LCA_by_position = {}
    
            each(LCAs, function (_, lca) {
                function process(base, regions, untouched, _by_position) {
                    _by_position[lca] = {}
                    var ri = 0
                    var r
                    each(untouched, function (u) {
                        while ((r = regions[ri]) && r[0] + r[1] <= u[2]) { ri++ }
                        while ((r = regions[ri]) && r[0] < u[2] + u[1]) {
                            _by_position[lca][r[0]] = ri
                            base[ri][2] = true
                            r[2] = true
                            ri++
                        }
                    })
                }
                process(prev_regions_per_node[prev_merge_node], prev_regions_per_node[lca], prev_untouched_regions_for_node[lca], prev_untouched_regions_for_LCA_by_position)
                process(leaf_regions_per_node[leaf], leaf_regions_per_node[lca], leaf_untouched_regions_for_node[lca], leaf_untouched_regions_for_LCA_by_position)
            })
    
            function mark_deletes_and_more(regions_for_node, node, other_untouched_for_LCA_by_position) {
                each(regions_for_node[node], function (r, ri) {
                    r[4] = r[5] = -1 // <-- the "more"
                    if (r[2]) {
                        r[3] = -1
                        each(LCAs, function (_, lca) {
                            var rr = regions_for_node[lca][ri]
                            var other_ri = other_untouched_for_LCA_by_position[lca][rr[0]]
                            if (rr[2] && (typeof(other_ri) == 'number')) {
                                r[3] = other_ri
                                return false
                            }
                        })
                    }
                })
            }
            mark_deletes_and_more(prev_regions_per_node, prev_merge_node, leaf_untouched_regions_for_LCA_by_position)
            mark_deletes_and_more(leaf_regions_per_node, leaf, prev_untouched_regions_for_LCA_by_position)
    
            function is_definitely_before(a_regions, a_node, ai, b_regions, b_node, bi) {
                var a_before_b = false
                var b_before_a = false
                each(LCAs, function (_, lca) {
                    var ar = a_regions[lca][ai]
                    var br = b_regions[lca][bi]
                    
                    if ((ar[1] || br[1]) && (ar[0] + ar[1] <= br[0]))
                        a_before_b = true
                    if ((!ar[1] && !br[1]) && (ar[0] < br[0]))
                        a_before_b = true
                        
                    if ((ar[1] || br[1]) && (br[0] + br[1] <= ar[0]))
                        b_before_a = true
                    if ((!ar[1] && !br[1]) && (br[0] < ar[0]))
                        b_before_a = true
                })
                return a_before_b && !b_before_a
            }
            
            function calc_known_orderings(a_regions, a_node, b_regions, b_node) {
                var bi = 0
                each(a_regions[a_node], function (ar, ai) {
                    for ( ; bi < b_regions[b_node].length; bi++) {
                        if (is_definitely_before(a_regions, a_node, ai, b_regions, b_node, bi)) {
                            ar[4] = bi
                            b_regions[b_node][bi][5] = ai
                            return
                        }
                    }
                })
            }
            calc_known_orderings(prev_regions_per_node, prev_merge_node, leaf_regions_per_node, leaf)
            calc_known_orderings(leaf_regions_per_node, leaf, prev_regions_per_node, prev_merge_node)
    
            var m = custom_merge_func(s7, prev_merge_node, leaf, texts[prev_merge_node], texts[leaf], prev_regions, leaf_regions)
            
            var id = guid()
            var to_parents = {}
            s7.commits[prev_merge_node].from_kids[id] = to_parents[prev_merge_node] = m.to_a
            s7.commits[leaf].from_kids[id] = to_parents[leaf] = m.to_b
            s7.commits[id] = s7.temp_commits[id] = { to_parents : to_parents, from_kids : {} }
            
            prev_merge_node = id
            texts[prev_merge_node] = m.text
        }
    
        s7.leaf = prev_merge_node
        s7.text = texts[prev_merge_node]
        
        return projected_cursors.map(function (cursor) {
            while (cursor[1] != s7.leaf) {
                var old_node = cursor[1]
                var kids = s7.commits[cursor[1]].from_kids
                var kid = Object.keys(kids)[0]
                var d = kids[kid]

                var offset = 0
                var poffset = 0
                each(d, function (d) {
                    if (typeof(d) == 'number') {
                        if (cursor[0] <= poffset + d) {
                            cursor[0] = cursor[0] - poffset + offset
                            cursor[1] = kid
                            return false
                        }
                        offset += d
                        poffset += d
                    } else {
                        if (cursor[0] <= poffset + d[1].length) {
                            cursor[0] = offset
                            cursor[1] = kid
                            return false
                        }
                        offset += d[0].length
                        poffset += d[1].length
                    }
                })
                if (cursor[1] == old_node) {
                    cursor[0] = offset
                    cursor[1] = kid
                }
            }
        })
    }

    function default_custom_merge_func(s7, a, b, a_text, b_text, a_regions, b_regions) {
        // regions be like [pos, len, untouched?, index in other region array of this untouched or -1 if not present, index of first region in other array that this region is definitely before, index of last region in other array that this region is definitely after]
        
        // console.log('HI!!')
        // console.log(a)
        // console.log(b)
        // console.log(a_text)
        // console.log(b_text)
        // console.log(a_regions)
        // console.log(b_regions)
    
        var text = []
        var a_diff = []
        var b_diff = []
        var on_a = true
        var ai = 0
        var bi = 0
        while (true) {
            var aa = a_regions[ai]
            var bb = b_regions[bi]
            if (!aa && !bb) break
            if (!aa) on_a = false
            if (!bb) on_a = true
            
            var ci = on_a ? ai : bi
            var di = on_a ? bi : ai
            var cc = on_a ? aa : bb
            var dd = on_a ? bb : aa
            var c_text = on_a ? a_text : b_text
            var d_text = on_a ? b_text : a_text
            var c_diff = on_a ? a_diff : b_diff
            var d_diff = on_a ? b_diff : a_diff
    
            if (cc[5] < di) {
                var t = c_text.substr(cc[0], cc[1])
                if (cc[2]) {
                    if (cc[3] < di) {
                        c_diff.push(['', t])
                    } else if (cc[3] == di) {
                        text.push(t)
                        sync7_push_eq(c_diff, cc[1])
                        sync7_push_eq(d_diff, cc[1])
                        if (on_a) { bi++ } else { ai++ }
                    } else {
                        text.push(t)
                        sync7_push_eq(c_diff, cc[1])
                        d_diff.push([t, ''])
                    }
                } else {
                    text.push(t)
                    sync7_push_eq(c_diff, cc[1])
                    d_diff.push([t, ''])
                }
                if (on_a) { ai++ } else { bi++ }
            } else if (dd && dd[5] < ci) {
                on_a = !on_a
            } else {
                throw 'failure'
            }
        }
    
        // console.log('HI!!!!!!')
        // console.log(text)
        // console.log(a_diff)
        // console.log(b_diff)
    
        return {
            text : text.join(''),
            to_a : a_diff,
            to_b : b_diff
        }
    }

    function sync7_diff_merge_trans(a, b, a_factor, b_factor) {
        var ret = []
        var a_i = 0
        var b_i = 0
        var a_offset = 0
        var b_offset = 0
        var a_dumped_load = false
        var b_dumped_load = false
        function neg_idx(i) {
            return i == 0 ? 1 : 0
        }
        function a_idx(i) {
            return a_factor == -1 ? neg_idx(i) : i
        }
        function b_idx(i) {
            return b_factor == -1 ? neg_idx(i) : i
        }
        while (a_i < a.length && b_i < b.length) {
            var da = a[a_i]
            var db = b[b_i]
            if (typeof(da) == 'number' && typeof(db) == 'number') {
                var a_len = da - a_offset
                var b_len = db - b_offset
                sync7_push_eq(ret, Math.min(a_len, b_len))
            } else if (typeof(da) == 'number') {
                var a_len = da - a_offset
                var b_len = db[b_idx(0)].length - b_offset
                sync7_push_rep(ret, db[b_idx(0)].substr(b_offset, Math.min(a_len, b_len)), !b_dumped_load ? db[b_idx(1)] : '')
                b_dumped_load = true
            } else if (typeof(db) == 'number') {
                var a_len = da[a_idx(1)].length - a_offset
                var b_len = db - b_offset
                sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', da[a_idx(1)].substr(a_offset, Math.min(a_len, b_len)))
                a_dumped_load = true
            } else {
                var a_len = da[a_idx(1)].length - a_offset
                var b_len = db[b_idx(0)].length - b_offset
                sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', !b_dumped_load ? db[b_idx(1)] : '')
                a_dumped_load = b_dumped_load = true
            }
            if (a_len > b_len) {
                a_offset += b_len
            } else {
                a_i++
                a_offset = 0
                a_dumped_load = false
            }
            if (a_len < b_len) {
                b_offset += a_len
            } else {
                b_i++
                b_offset = 0
                b_dumped_load = false
            }
        }
        while (a_i < a.length) {
            var da = a[a_i]
            if (typeof(da) == 'number') {
                sync7_push_eq(ret, da)
            } else {
                sync7_push_rep(ret, !a_dumped_load ? da[a_idx(0)] : '', da[a_idx(1)].substr(a_offset))
            }
            a_i++
            a_offset = 0
            a_dumped_load = false
        }
        while (b_i < b.length) {
            var db = b[b_i]
            if (typeof(db) == 'number') {
                sync7_push_eq(ret, db)
            } else {
                sync7_push_rep(ret, db[b_idx(0)].substr(b_offset), !b_dumped_load ? db[b_idx(1)] : '')
            }
            b_i++
            b_offset = 0
            b_dumped_load = false
        }
        return ret
    }
    
    function sync7_merge_path_up(s7, from, path) {
        var diff = []
        var prev = from
        each(path, function (next) {
            diff = sync7_diff_merge_trans(diff, s7.commits[prev].to_parents[next])
            prev = next
        })
        return diff
    }
    
    
    function sync7_get_text(s7, id) {
        var ls = sync7_get_leaves(sync7_intersection(sync7_get_ancestors(s7, s7.leaf, true), sync7_get_ancestors(s7, id, true)))
        var lca = Object.keys(ls)[0]
        var leaf_to_lca = sync7_get_path_to_ancestor(s7, s7.leaf, lca)
        var lca_to_id = sync7_get_path_to_ancestor(s7, id, lca).reverse()
        if (lca_to_id.length > 0) {
            lca_to_id.shift()
            lca_to_id.push(id)
        }
        
        var diff = sync7_merge_path_up(s7, s7.leaf, leaf_to_lca)
        var prev = lca
        each(lca_to_id, function (next) {
            diff = sync7_diff_merge_trans(diff, s7.commits[next].to_parents[prev], 1, -1)
            prev = next
        })
        
        return sync7_diff_apply(s7.text, diff)
    }
        
    function sync7_get_leaves(commits, ignore) {
        if (!ignore) ignore = {}
        var leaves = {}
        each(commits, function (_, id) {
            if (ignore[id]) { return }
            leaves[id] = true
        })
        each(commits, function (c, id) {
            if (ignore[id]) { return }
            each(c.to_parents, function (_, p) {
                delete leaves[p]
            })
        })
        return leaves
    }
    
    function sync7_get_ancestors(s7, id_or_set, include_self) {
        var frontier = null
        var ancestors = {}
        if (typeof(id_or_set) == 'object') {
            frontier = Object.keys(id_or_set)
            if (include_self) each(id_or_set, function (_, id) {
                ancestors[id] = s7.commits[id]
            })
        } else {
            frontier = [id_or_set]
            if (include_self) ancestors[id_or_set] = s7.commits[id_or_set]
        }
        while (frontier.length > 0) {
            var next = frontier.shift()
            each(s7.commits[next].to_parents, function (_, p) {
                if (!ancestors[p]) {
                    ancestors[p] = s7.commits[p]
                    frontier.push(p)
                }
            })
        }
        return ancestors
    }
    
    function sync7_get_path_to_ancestor(s7, a, b) {
        if (a == b) { return [] }
        var frontier = [a]
        var backs = {}
        while (frontier.length > 0) {
            var next = frontier.shift()
            if (next == b) {
                var path = []
                while (next && (next != a)) {
                    path.unshift(next)
                    next = backs[next]
                }
                return path
            }
            each(s7.commits[next].to_parents, function (_, p) {
                if (!backs[p]) {
                    backs[p] = next
                    frontier.push(p)
                }
            })
        }
        throw 'no path found from ' + a + ' to ' + b
    }
    
    function sync7_intersection(a, b) {
        var common = {}
        each(a, function (_, x) {
            if (b[x]) {
                common[x] = a[x]
            }
        })
        return common
    }
    
    function sync7_diff(a, b) {
        var ret = []
        var d = diff_main(a, b)
        for (var i = 0; i < d.length; i++) {
            var top = ret[ret.length - 1]
            if (d[i][0] == 0) {
                ret.push(d[i][1].length)
            } else if (d[i][0] == 1) {
                if (top && (typeof(top) != 'number'))
                    top[1] += d[i][1]
                else
                    ret.push(['', d[i][1]])
            } else {
                if (top && (typeof(top) != 'number'))
                    top[0] += d[i][1]
                else
                    ret.push([d[i][1], ''])
            }
        }
        return ret
    }
    
    function sync7_push_eq(diffs, size) {
        if (typeof(diffs[diffs.length - 1]) == 'number') {
            diffs[diffs.length - 1] += size
        } else diffs.push(size)
    }
    
    function sync7_push_rep(diffs, del, ins) {
        if (del.length == 0 && ins.length == 0) { return }
        if (diffs.length > 0) {
            var top = diffs[diffs.length - 1]
            if (typeof(top) != 'number') {
                top[0] += del
                top[1] += ins
                return
            }
        }
        diffs.push([del, ins])
    }
    
    function sync7_diff_apply(s, diff) {
        var offset = 0
        var texts = []
        each(diff, function (d) {
            if (typeof(d) == 'number') {
                texts.push(s.substr(offset, d))
                offset += d
            } else {
                texts.push(d[1])
                offset += d[0].length
            }
        })
        texts.push(s.substr(offset))
        return texts.join('')
    }
    
    function guid() {
        var x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        var s = []
        for (var i = 0; i < 15; i++) {
            s.push(x[Math.floor(Math.random() * x.length)])
        }
        return s.join('')
    }

    function each(o, cb) {
        if (o instanceof Array) {
            for (var i = 0; i < o.length; i++) {
                if (cb(o[i], i, o) == false)
                    return false
            }
        } else {
            for (var k in o) {
                if (o.hasOwnProperty(k)) {
                    if (cb(o[k], k, o) == false)
                        return false
                }
            }
        }
        return true
    }

    function map(o, func) {
        if (o instanceof Array) {
            var accum = []
            for (var i = 0; i < o.length; i++)
                accum[i] = func(o[i], i, o)
            return accum
        } else {
            var accum = {}
            for (var k in o)
                if (o.hasOwnProperty(k))
                    accum[k] = func(o[k], k, o)
            return accum
        }
    }
    
    
    
    
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
////////////////////// HI ///////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////




/**
 * This library modifies the diff-patch-match library by Neil Fraser
 * by removing the patch and match functionality and certain advanced
 * options in the diff function. The original license is as follows:
 *
 * ===
 *
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {Int} cursor_pos Expected edit position in text1 (optional)
 * @return {Array} Array of diff tuples.
 */
function diff_main(text1, text2, cursor_pos) {
  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  // Check cursor_pos within bounds
  if (cursor_pos < 0 || text1.length < cursor_pos) {
    cursor_pos = null;
  }

  // Trim off common prefix (speedup).
  var commonlength = diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = diff_compute_(text1, text2);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  diff_cleanupMerge(diffs);
  if (cursor_pos != null) {
    diffs = fix_cursor(diffs, cursor_pos);
  }
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @return {Array} Array of diff tuples.
 */
function diff_compute_(text1, text2) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = diff_main(text1_a, text2_a);
    var diffs_b = diff_main(text1_b, text2_b);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  return diff_bisect_(text1, text2);
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @return {Array} Array of diff tuples.
 * @private
 */
function diff_bisect_(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return diff_bisectSplit_(text1, text2, x1, y1);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return diff_bisectSplit_(text1, text2, x1, y1);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @return {Array} Array of diff tuples.
 */
function diff_bisectSplit_(text1, text2, x, y) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = diff_main(text1a, text2a);
  var diffsb = diff_main(text1b, text2b);

  return diffs.concat(diffsb);
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
function diff_commonPrefix(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
function diff_commonSuffix(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 */
function diff_halfMatch_(text1, text2) {
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = diff_commonPrefix(longtext.substring(i),
                                           shorttext.substring(j));
      var suffixLength = diff_commonSuffix(longtext.substring(0, i),
                                           shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {Array} diffs Array of diff tuples.
 */
function diff_cleanupMerge(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    diff_cleanupMerge(diffs);
  }
};


/*
 * Modify a diff such that the cursor position points to the start of a change:
 * E.g.
 *   cursor_normalize_diff([[DIFF_EQUAL, 'abc']], 1)
 *     => [1, [[DIFF_EQUAL, 'a'], [DIFF_EQUAL, 'bc']]]
 *   cursor_normalize_diff([[DIFF_INSERT, 'new'], [DIFF_DELETE, 'xyz']], 2)
 *     => [2, [[DIFF_INSERT, 'new'], [DIFF_DELETE, 'xy'], [DIFF_DELETE, 'z']]]
 *
 * @param {Array} diffs Array of diff tuples
 * @param {Int} cursor_pos Suggested edit position. Must not be out of bounds!
 * @return {Array} A tuple [cursor location in the modified diff, modified diff]
 */
function cursor_normalize_diff (diffs, cursor_pos) {
  if (cursor_pos === 0) {
    return [DIFF_EQUAL, diffs];
  }
  for (var current_pos = 0, i = 0; i < diffs.length; i++) {
    var d = diffs[i];
    if (d[0] === DIFF_DELETE || d[0] === DIFF_EQUAL) {
      var next_pos = current_pos + d[1].length;
      if (cursor_pos === next_pos) {
        return [i + 1, diffs];
      } else if (cursor_pos < next_pos) {
        // copy to prevent side effects
        diffs = diffs.slice();
        // split d into two diff changes
        var split_pos = cursor_pos - current_pos;
        var d_left = [d[0], d[1].slice(0, split_pos)];
        var d_right = [d[0], d[1].slice(split_pos)];
        diffs.splice(i, 1, d_left, d_right);
        return [i + 1, diffs];
      } else {
        current_pos = next_pos;
      }
    }
  }
  throw new Error('cursor_pos is out of bounds!')
}

/*
 * Modify a diff such that the edit position is "shifted" to the proposed edit location (cursor_position).
 *
 * Case 1)
 *   Check if a naive shift is possible:
 *     [0, X], [ 1, Y] -> [ 1, Y], [0, X]    (if X + Y === Y + X)
 *     [0, X], [-1, Y] -> [-1, Y], [0, X]    (if X + Y === Y + X) - holds same result
 * Case 2)
 *   Check if the following shifts are possible:
 *     [0, 'pre'], [ 1, 'prefix'] -> [ 1, 'pre'], [0, 'pre'], [ 1, 'fix']
 *     [0, 'pre'], [-1, 'prefix'] -> [-1, 'pre'], [0, 'pre'], [-1, 'fix']
 *         ^            ^
 *         d          d_next
 *
 * @param {Array} diffs Array of diff tuples
 * @param {Int} cursor_pos Suggested edit position. Must not be out of bounds!
 * @return {Array} Array of diff tuples
 */
function fix_cursor (diffs, cursor_pos) {
  var norm = cursor_normalize_diff(diffs, cursor_pos);
  var ndiffs = norm[1];
  var cursor_pointer = norm[0];
  var d = ndiffs[cursor_pointer];
  var d_next = ndiffs[cursor_pointer + 1];

  if (d == null) {
    // Text was deleted from end of original string,
    // cursor is now out of bounds in new string
    return diffs;
  } else if (d[0] !== DIFF_EQUAL) {
    // A modification happened at the cursor location.
    // This is the expected outcome, so we can return the original diff.
    return diffs;
  } else {
    if (d_next != null && d[1] + d_next[1] === d_next[1] + d[1]) {
      // Case 1)
      // It is possible to perform a naive shift
      ndiffs.splice(cursor_pointer, 2, d_next, d)
      return merge_tuples(ndiffs, cursor_pointer, 2)
    } else if (d_next != null && d_next[1].indexOf(d[1]) === 0) {
      // Case 2)
      // d[1] is a prefix of d_next[1]
      // We can assume that d_next[0] !== 0, since d[0] === 0
      // Shift edit locations..
      ndiffs.splice(cursor_pointer, 2, [d_next[0], d[1]], [0, d[1]]);
      var suffix = d_next[1].slice(d[1].length);
      if (suffix.length > 0) {
        ndiffs.splice(cursor_pointer + 2, 0, [d_next[0], suffix]);
      }
      return merge_tuples(ndiffs, cursor_pointer, 3)
    } else {
      // Not possible to perform any modification
      return diffs;
    }
  }

}

/*
 * Try to merge tuples with their neigbors in a given range.
 * E.g. [0, 'a'], [0, 'b'] -> [0, 'ab']
 *
 * @param {Array} diffs Array of diff tuples.
 * @param {Int} start Position of the first element to merge (diffs[start] is also merged with diffs[start - 1]).
 * @param {Int} length Number of consecutive elements to check.
 * @return {Array} Array of merged diff tuples.
 */
function merge_tuples (diffs, start, length) {
  // Check from (start-1) to (start+length).
  for (var i = start + length - 1; i >= 0 && i >= start - 1; i--) {
    if (i + 1 < diffs.length) {
      var left_d = diffs[i];
      var right_d = diffs[i+1];
      if (left_d[0] === right_d[1]) {
        diffs.splice(i, 2, [left_d[0], left_d[1] + right_d[1]]);
      }
    }
  }
  return diffs;
}
    
    


    
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
////////////////////// YO ///////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
/////////////////////////////////////////////////
    
    
    
    
})();
