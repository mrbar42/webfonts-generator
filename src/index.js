var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var _ = require('underscore')

var generateFonts = require('./generateFonts')
var renderCss = require('./renderCss')
var renderHtml = require('./renderHtml')

var TEMPLATES_DIR = path.join(__dirname, '..', 'templates')
var TEMPLATES = {
	css: path.join(TEMPLATES_DIR, 'css.hbs'),
	scss: path.join(TEMPLATES_DIR, 'scss.hbs'),
	html: path.join(TEMPLATES_DIR, 'html.hbs')
}

var DEFAULT_TEMPLATE_OPTIONS = {
	baseClass: 'icon',
	classPrefix: 'icon-'
}

var DEFAULT_OPTIONS = {
	writeFiles: true,
	fontName: 'iconfont',
	css: true,
	cssTemplate: TEMPLATES.css,
	cssFontsPath: '',
	html: false,
	htmlTemplate: TEMPLATES.html,
	types: ['eot', 'woff'],
	order: ['eot', 'woff', 'ttf', 'svg'],
	rename: function(file) {
		return path.basename(file, path.extname(file))
	},
	/**
	 * Unicode Private Use Area start.
	 * http://en.wikipedia.org/wiki/Private_Use_(Unicode)
	 */
	startCodepoint: 0xF101,
	normalize: true
}

var webfont = function(options, done) {
	options = _.extend({}, DEFAULT_OPTIONS, options)

	if (options.dest === undefined) return done(new Error('"options.dest" is undefined.'))
	if (options.files === undefined) return done(new Error('"options.files" is undefined.'))
	if (!options.files.length) return done(new Error('"options.files" is empty.'))

	// We modify codepoints later, so we can't use same object from default options.
	if (options.codepoints === undefined) options.codepoints = {}

	options.names = _.map(options.files, options.rename)
	if (options.cssDest === undefined) {
		options.cssDest = path.join(options.dest, options.fontName + '.css')
	}
	if (options.htmlDest === undefined) {
		options.htmlDest = path.join(options.dest, options.fontName + '.html')
	}

	options.templateOptions = _.extend({}, DEFAULT_TEMPLATE_OPTIONS, options.templateOptions)

	// Generates codepoints starting from `options.startCodepoint`,
	// skipping codepoints explicitly specified in `options.codepoints`
	var currentCodepoint = options.startCodepoint
	var codepointsValues = _.values(options.codepoints)
	function getNextCodepoint() {
		while (_.contains(codepointsValues, currentCodepoint)) {
			currentCodepoint++
		}
		var res = currentCodepoint
		currentCodepoint++
		return res
	}
	_.each(options.names, function(name) {
		if (!options.codepoints[name]) {
			options.codepoints[name] = getNextCodepoint()
		}
	})

	// TODO output
	generateFonts(options)
		.then(function(result) {
			if (options.writeFiles) writeResult(result, options)

			result.generateCss = function(urls) {
				return renderCss(options, urls)
			}
			done(null, result)
		})
		.catch(function(err) { done(err) })
}

function writeFile(content, dest) {
	mkdirp.sync(path.dirname(dest))
	fs.writeFileSync(dest, content)
}

function writeResult(fonts, options) {
	_.each(fonts, function(content, type) {
		var filepath = path.join(options.dest, options.fontName + '.' + type)
		writeFile(content, filepath)
	})
	if (options.css) {
		var css = renderCss(options)
		writeFile(css, options.cssDest)
	}
	if (options.html) {
		var html = renderHtml(options)
		writeFile(html, options.htmlDest)
	}
}

webfont.templates = TEMPLATES

module.exports = webfont
