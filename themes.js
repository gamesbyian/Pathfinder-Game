// Pathfinder theme definitions — seed format.
// Each theme specifies 7-8 seed colors; all other tokens are derived algorithmically
// by deriveTokens() in modules/theme-engine.js, then finalized by normalizeTheme().
//
// Seeds:
//   bg       – body / app background
//   surface  – canvas and modal panel surface
//   primary  – dominant accent (header right, primary buttons, gate color)
//   secondary – contrasting accent (header left, danger/reset, goal color)
//   neutral  – mid-tone for grid lines, muted UI elements
//   text     – default body / modal text color
//   border   – structural borders and dividers
//   path     – solution-path color (optional; defaults to primary; use "rainbow" for animated)
//
// Optional `overrides` can set any derived token to a custom value, using the same
// nested structure as the full theme object (e.g. { colors: { portal: '#ff00ff' } }).

window.THEMES = {

    classic: {
        seeds: { bg:'#e0f2fe', surface:'#ffffff',  primary:'#2563eb', secondary:'#dc2626', neutral:'#94a3b8', text:'#334155', border:'#cbd5e1', path:'rainbow' }
    },

    dark: {
        seeds: { bg:'#020617', surface:'#111827',  primary:'#1e3a8a', secondary:'#7f1d1d', neutral:'#475569', text:'#f8fafc', border:'#334155', path:'#22c55e' }
    },

    tron: {
        seeds: { bg:'#000000', surface:'#001d3d',  primary:'#ff00ff', secondary:'#00d9ff', neutral:'#00d9ff', text:'#00d9ff', border:'#00d9ff', path:'#00d9ff' },
        overrides: {
            colors: { gate:'#00d9ff', goal:'#ff00ff', filter:'#00d9ff', cross:'#00d9ff' },
            win: { accent:'#00d9ff' },
        }
    },

    paper: {
        seeds: { bg:'#fdf6e3', surface:'#fffaf0',  primary:'#555555', secondary:'#000000', neutral:'#3b3b3b', text:'#1a1a1a', border:'#c8c0a8', path:'#000000' },
        overrides: {
            modal: { bg:'rgba(253,246,227,0.97)' },
        }
    },

    winter: {
        seeds: { bg:'#e0f2fe', surface:'#f0f9ff',  primary:'#0284c7', secondary:'#0ea5e9', neutral:'#7dd3fc', text:'#0c4a6e', border:'#0ea5e9', path:'#2563eb' }
    },

    summer: {
        seeds: { bg:'#fff7ed', surface:'#ffedd5',  primary:'#f97316', secondary:'#ea580c', neutral:'#fb923c', text:'#431407', border:'#ea580c', path:'#16a34a' }
    },

    glf: {
        seeds: { bg:'#bdc3c7', surface:'#ecf0f1',  primary:'#4a90e2', secondary:'#d21f1b', neutral:'#95a5a6', text:'#2c3e50', border:'#95a5a6', path:'#f4d03f' }
    },

    lcars: {
        seeds: { bg:'#000000', surface:'#000000',  primary:'#cc99cc', secondary:'#ff9900', neutral:'#333333', text:'#cc99cc', border:'#ff9900', path:'#ff9900' },
        overrides: {
            btns: { hint:'#ff9900', whoa:'#cc99cc' },
            colors: { gate:'#ff9900', goal:'#cc99cc' },
            win: { accent:'#cc99cc' },
        }
    },

    candy_apple: {
        seeds: { bg:'#ffe5e5', surface:'#ffffff',  primary:'#ff0800', secondary:'#cc0000', neutral:'#ffaaaa', text:'#7a0000', border:'#ff6666', path:'#ff0800' }
    },

    blonde: {
        seeds: { bg:'#fdfbf7', surface:'#ffffff',  primary:'#c4a832', secondary:'#a88c1a', neutral:'#e6dfc8', text:'#7a6430', border:'#d4c271', path:'#c4a832' }
    },

    fincher: {
        seeds: { bg:'#0d110e', surface:'#121a15',  primary:'#79875f', secondary:'#5e6a4b', neutral:'#354536', text:'#8c9d6f', border:'#4a5c3b', path:'#8c9d6f' }
    },

    roygbiv: {
        seeds: { bg:'#ffffff', surface:'#f8f9fa',  primary:'#ff7f00', secondary:'#ff0000', neutral:'#e2e8f0', text:'#4b0082', border:'#9400d3', path:'rainbow' },
        overrides: {
            modal: { text:'#4b0082', accent:'#1a0040' },
        }
    },

    so_purple: {
        seeds: { bg:'#2e1065', surface:'#3b0764',  primary:'#9333ea', secondary:'#7e22ce', neutral:'#581c87', text:'#e9d5ff', border:'#a855f7', path:'#c084fc' }
    },

    denim: {
        seeds: { bg:'#0f172a', surface:'#1e293b',  primary:'#2563eb', secondary:'#1d4ed8', neutral:'#334155', text:'#93c5fd', border:'#3b82f6', path:'#60a5fa' }
    },

    hello_kitty: {
        seeds: { bg:'#ffe4e1', surface:'#fff0f5',  primary:'#ff1493', secondary:'#ff69b4', neutral:'#ffb6c1', text:'#8b1a5e', border:'#ff69b4', path:'#ff1493' }
    },

    black_tie: {
        seeds: { bg:'#1a1a1a', surface:'#f0f0f0',  primary:'#333333', secondary:'#000000', neutral:'#cccccc', text:'#333333', border:'#aaaaaa', path:'#222222' },
        overrides: {
            modal: { bg:'rgba(240,240,240,0.97)', text:'#111111', accent:'#000000' },
        }
    },

    vegas: {
        seeds: { bg:'#0b001a', surface:'#1a0b2e',  primary:'#00f3ff', secondary:'#ff007f', neutral:'#3d1c5e', text:'#00f3ff', border:'#ff007f', path:'#39ff14' },
        overrides: {
            colors: { gate:'#00f3ff', goal:'#ff007f', portal:'#ff00ff' },
        }
    },

    sherbet: {
        seeds: { bg:'#ffebd6', surface:'#fff5ec',  primary:'#ff4d6d', secondary:'#d92550', neutral:'#ffb3c6', text:'#7a1030', border:'#ff4d6d', path:'#ff7b00' }
    },

    chrome: {
        seeds: { bg:'#8c92ac', surface:'#e6e8fa',  primary:'#7b889b', secondary:'#5f6b7d', neutral:'#b0b7c6', text:'#2c3539', border:'#8a9099', path:'#2c3539' }
    },

    yankees: {
        seeds: { bg:'#e4e5e8', surface:'#ffffff',  primary:'#8ea1b3', secondary:'#0c2340', neutral:'#b0b7bc', text:'#0c2340', border:'#8ea1b3', path:'#0c2340' }
    },

    ketchup_mustard: {
        seeds: { bg:'#fff3cd', surface:'#ffffff',  primary:'#ffc107', secondary:'#d22b2b', neutral:'#ffe8a1', text:'#7a1a1a', border:'#d22b2b', path:'#d22b2b' }
    },

    forest: {
        seeds: { bg:'#e9f5e9', surface:'#f2fcf2',  primary:'#4a7c49', secondary:'#2e5a2c', neutral:'#c2e0c2', text:'#2e5a2c', border:'#4a7c49', path:'#8b5a2b' }
    },

    gold: {
        seeds: { bg:'#2a2515', surface:'#1c190d',  primary:'#ffd700', secondary:'#b8860b', neutral:'#5c4a10', text:'#ffdf00', border:'#b8860b', path:'#ffd700' },
        overrides: {
            modal: { text:'#ffdf00', accent:'#ffffff' },
            win: { text:'#b8860b' },
        }
    },

    tupperware: {
        seeds: { bg:'#f4ebd0', surface:'#dfd3ae',  primary:'#5b7c2f', secondary:'#cc5500', neutral:'#c9bb8e', text:'#4d3826', border:'#8a7550', path:'#e49b0f' }
    },

    paddys_day: {
        seeds: { bg:'#e8f5e9', surface:'#ffffff',  primary:'#006400', secondary:'#e65100', neutral:'#a5d6a7', text:'#1b5e20', border:'#66bb6a', path:'#ffd700' }
    },

    usa: {
        seeds: { bg:'#f0f4f8', surface:'#ffffff',  primary:'#002868', secondary:'#bf0a30', neutral:'#b3c6d6', text:'#002868', border:'#b3c6d6', path:'#bf0a30' }
    },

    kwanzaa: {
        seeds: { bg:'#fff8e7', surface:'#ffffff',  primary:'#000000', secondary:'#d32f2f', neutral:'#d7ccc8', text:'#1a0a00', border:'#bcaaa4', path:'#4caf50' },
        overrides: {
            modal: { text:'#1a0a00', accent:'#000000' },
            colors: { gate:'#d32f2f', goal:'#4caf50' },
        }
    },

    cozy_cottage: {
        seeds: { bg:'#fdf6e3', surface:'#ffffff',  primary:'#7aab7a', secondary:'#c27db0', neutral:'#d7ccc8', text:'#5d4037', border:'#bcaaa4', path:'#8d6e63' }
    },

    patchwork: {
        seeds: { bg:'#f4eedd', surface:'#faf8f5',  primary:'#5c8397', secondary:'#ab5a50', neutral:'#b5a8b3', text:'#4a3e49', border:'#9e9099', path:'#d99b48' }
    },

    canada: {
        seeds: { bg:'#f8f9fa', surface:'#ffffff',  primary:'#c8102e', secondary:'#000000', neutral:'#cbd5e1', text:'#111111', border:'#e0e0e0', path:'#c8102e' }
    },

    sock_hop: {
        seeds: { bg:'#e0ffff', surface:'#ffffff',  primary:'#008b8b', secondary:'#ff69b4', neutral:'#aaaaaa', text:'#004444', border:'#66cccc', path:'#ff1493' }
    },

    ultra_modern: {
        seeds: { bg:'#111111', surface:'#1a1a1a',  primary:'#00ffff', secondary:'#ff007f', neutral:'#444444', text:'#00ffff', border:'#ffffff', path:'#bf00ff' },
        overrides: {
            headerLeft: '#000000',
            headerRight: '#222222',
            btns: { modeToggle:'#000000', orient:'#000000', whoa:'#222222' },
            colors: { gate:'#00ffff', goal:'#ff007f', portal:'#bf00ff', filter:'#00ffff', cross:'#ffffff' },
            win: { border:'#00ffff', accent:'#00ffff' },
            alert: { bg:'#222222', stroke:'#00ffff' },
        }
    },

};
