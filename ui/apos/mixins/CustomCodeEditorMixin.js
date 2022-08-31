/* eslint-disable no-undef */
import _ from 'lodash';
import ClipboardJS from 'clipboard';

/**
 * @model CustomCodeEditorMixin
 * @desc Mixin for Custom Code Editor
 */
export default {
  methods: {

    /**
     * @method beforeInit
     * @desc Easy extend using this function
     * @param {HTMLElement} element
     */
    beforeInit(element) {
      // For extendMethods
    },

    /**
     * @method init
     * @desc Init Custom Code Editor
     * @param {HTMLElement} element
     * @return {aceEditor} Return editor intialized from ACE JS
     */
    init(element) {
      const self = this;
      // Default Empty Value
      this.beforeInit(element);
      const editor = this.editor(element);
      this.setEditor(editor);
      editor.setValue('');
      editor.session.setMode(this.ace.aceModePath + this.ace.defaultMode.toLowerCase());
      editor.setTheme(this.ace.aceThemePath + this.ace.theme);

      // Register Editor Events
      this.editorEvents.call(self, editor);

      // If got specific height for editor container
      if (_.has(this.ace, 'config.editorHeight')) {
        element.style.height = this.ace.config.editorHeight;
      }

      // If got fontSize config for editor
      if (_.has(this.ace, 'config.fontSize')) {
        element.style.fontSize = (typeof this.ace.config.fontSize === 'number') ? 'font-size :' + this.ace.config.fontSize.toString() + 'px !important;' : 'font-size :' + this.ace.config.fontSize + ' !important;';
      }

      // Options reference: https://github.com/ajaxorg/ace/wiki/Configuring-Ace
      if (_.has(this.ace, 'options')) {
        const options = this.ace.options;
        for (const key in options) {
          // eslint-disable-next-line no-prototype-builtins
          if (options.hasOwnProperty(key)) {
            editor.setOptions(apos.util.assign(options));
          }
        }
      }

      // Enable dropdown
      if (_.has(this.ace, 'config.dropdown') && _.has(this.ace, 'config.dropdown.enable')) {
        this.setDropdown();
      }

      if (ClipboardJS.isSupported() && !_.has(this.ace, 'config.optionsCustomizer.enable')) {
        // Init ClipboardJS
        this.initCopyClipboard(this.$el.querySelector('button.copy-options'));
      } else if (!ClipboardJS.isSupported()) {
        console.warn('ClipboardJS is not supported in this browser');
      }

      // Invoke after init
      this.afterInit(element);

      // Always return editor so that superInit can get editor directly from the extend method.
      return editor;
    },

    /**
     * @method afterInit
     * @desc Easy extend after init
     * @param {HTMLElement} element
     */
    afterInit(element) {
      this.setDefaultSubmitValue();
    },

    /**
     * @method initCopyClipboard
     * @desc Init ClipboardJS
     * @param {HTMLElement} copyButton
     */
    initCopyClipboard(copyButton) {
      this.clipboard = new ClipboardJS(copyButton);
      this.clipboardEvents(this.clipboard);
    },

    /**
     * @method clipboardEvents
     * @desc Register Clipboard events
     * @param {ClipboardJS} clipboard
     */
    clipboardEvents(clipboard) {
      clipboard.on('success', this.successClipboard);
      clipboard.on('error', this.errorClipboard);
    },

    /**
     * @method successClipboard
     * @desc Success Clipboard Event
     * @param {ClipboardJS.Event} e
     */
    successClipboard(e) {
      apos.notify('"' + this.field.name + '" field: ' + 'Options Copied!', {
        type: 'success',
        dismiss: true
      });

      e.clearSelection();
    },

    /**
     * @method errorClipboard
     * @desc Error Clipboard Event
     * @param {ClipboardJS.Event} e
     */
    errorClipboard(e) {
      console.error('Action: ', e.action);
      console.error('Trigger: ', e.trigger);
      apos.notify('Unable to copy options', {
        type: 'error',
        dismiss: true
      });
    },

    /**
     * @method destroyClipboard
     * @desc Destroy Clipboard event
     */
    destroyClipboard() {
      if (this.clipboard) {
        this.clipboard.off('success', this.successClipboard);
        this.clipboard.off('error', this.errorClipboard);
        this.clipboard.destroy();
      }
    },

    /**
     * @method setDropdown
     * @desc To Set Dropdown if dropdown enable
     */
    setDropdown() {
      const editor = this.getEditor();
      const self = this;

      // Save new value when press save command
      editor.commands.addCommand({
        name: 'saveNewCode',
        bindKey: {
          win: (_.has(this.ace, 'config.saveCommand.win')) ? this.ace.config.saveCommand.win : 'Ctrl-Shift-S',
          mac: (_.has(this.ace, 'config.saveCommand.mac')) ? this.ace.config.saveCommand.mac : 'Command-Shift-S'
        },
        exec: function (editor) {
          // If Two or more editor in single schema , show field name
          if (self.$root.$el.querySelectorAll('.editor-container').length > 1) {
            apos.notify((_.has(self.ace, 'config.saveCommand.message')) ? self.ace.config.saveCommand.message + ' - Field Name : ' + self.field.name : 'Selected Code Saved Successfully' + ' - Field Name : ' + self.field.name, {
              type: 'success',
              dismiss: 2
            });
          } else {
            apos.notify((_.has(self.ace, 'config.saveCommand.message')) ? self.ace.config.saveCommand.message : 'Selected Code Saved Successfully', {
              type: 'success',
              dismiss: 2
            });
          }
          self.originalValue = editor.getSelectedText();
        },
        readOnly: false
      });

      // create dropdown modes
      for (let i = 0; i < this.ace.modes.length; i++) {

        // Set defaultMode if found defined modes
        if (self.ace.defaultMode.toLowerCase() === self.ace.modes[i].name.toLowerCase()) {

          editor.session.setMode('ace/mode/' + self.ace.defaultMode.toLowerCase());

          if (self.ace.modes[i].snippet && !self.ace.modes[i].disableSnippet) {

            // eslint-disable-next-line no-undef
            const beautify = ace.require('ace/ext/beautify');
            editor.session.setValue(self.ace.modes[i].snippet);
            beautify.beautify(editor.session);
            // Find the template for replace the code area
            const find = editor.find('@code-here', {
              backwards: false,
              wrap: true,
              caseSensitive: true,
              wholeWord: true,
              regExp: false
            });

            // If found
            if (find) {
              editor.replace('');
            }
          }
        }
      };
    },

    /**
     * @method filterModesList
     * @desc Filter Modes by Search Input Event
     * @param {Event} e
     */
    filterModesList(e) {
      let input, filter, li, i, div, txtValue;
      // eslint-disable-next-line prefer-const
      input = e.currentTarget;
      // eslint-disable-next-line prefer-const
      filter = input.value.toUpperCase();
      // eslint-disable-next-line prefer-const
      div = this.$el.querySelector('.dropdown-content');
      // eslint-disable-next-line prefer-const
      li = div.querySelectorAll('li');
      for (i = 0; i < li.length; i++) {
        (function (i) {
          txtValue = li[i].innerText;

          if (txtValue.toUpperCase().indexOf(filter) > -1) {
            li[i].style.display = '';
          } else {
            li[i].style.display = 'none';
          }
        }(i));
      }
    },

    /**
     * @method changeMode
     * @desc Change Mode event when mode dropdown is clicked
     * @param {Event} e Event Listener
     * @return {null} Return nothing because it will automatically assign Mode to editor
     */
    changeMode(e) {
      const getText = e.currentTarget.getAttribute('data-name');
      const getTitle = e.currentTarget.getAttribute('data-title');
      const editor = this.getEditor();
      this.$el.querySelector('.dropdown-title').innerText = ((getTitle) || this.getName(getText));
      for (let i = 0; i < this.ace.modes.length; i++) {
        if (getText === this.ace.modes[i].name.toLowerCase()) {

          editor.session.setMode('ace/mode/' + this.ace.modes[i].name.toLowerCase());

          if (this.ace.modes[i].snippet) {
            // If got disableContent , get out from this if else
            if (this.ace.modes[i].disableSnippet) {
              return;
            }

            const beautify = ace.require('ace/ext/beautify');
            editor.session.setValue(this.ace.modes[i].snippet);
            beautify.beautify(editor.session);
            // If changing mode got existing codes , replace the value
            if (editor.getSelectedText().length > 1) {
              this.originalValue = editor.replace(editor.getSelectedText());
              return;
            }

            // Find the template for replace the code area
            const find = editor.find('@code-here', {
              backwards: false,
              wrap: true,
              caseSensitive: true,
              wholeWord: true,
              regExp: false
            });

            // If found
            if (find && !_.isUndefined(this.originalValue)) {
              editor.replace(this.originalValue);
            } else {
              editor.replace('');
            }
          }
        }
      }
    },

    /**
     * @method setEditor
     * @desc Set Editor
     * @param {aceEditor} editor
     */
    setEditor(editor) {
      this.ace.aceEditor = editor;
      apos.customCodeEditor.browser.editor = apos.util.assign({}, apos.customCodeEditor.browser.editor, {
        [this.field.name]: editor
      });
    },

    /**
     * @method getEditor
     * @desc Get Editor
     * @return {aceEditor} Get Editor or Null
     */
    getEditor() {
      if (this.ace.aceEditor) {
        return this.ace.aceEditor;
      }

      return null;
    },

    /**
     * @method editor
     * @desc Initialize editor
     * @param {HTMLElement} element
     * @return {aceEditor} Return initialized AceJS Editor from Element
     */
    editor(element) {
      return ace.edit(element);
    },

    /**
     * @method getName
     * @desc To convert any 'camelCase' name to 'Camel Case'
     * @param {String} name
     * @return {String} String that has been trimmed and modified
     */
    getName(name) {
      return name.replace(/(_|-)/g, ' ')
        .trim()
        .replace(/\w\S*/g, function (str) {
          return str.charAt(0).toUpperCase() + str.substr(1);
        })
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .trim();
    },

    /**
     * @method setDefaultSubmitValue
     * @desc To set default Submit value for `this.next` that will contains:
     * ```js
     *  this.next = {
     *    code: '',
     *    type: ''
     *  }
     * ```
     */
    setDefaultSubmitValue() {
      if (!_.isObject(this.next)) {
        this.next = {
          code: '',
          type: ''
        };
      } else {
        // Assign to original value;
        this.originalValue = this.next.code;
      }
    },

    /**
     * @method setEditorValue
     * @desc Set editor value on `mounted` function.
     */
    setEditorValue() {
      const editor = this.getEditor();
      if (_.isObject(this.next) && (_.has(this.next, 'code') && !_.isEmpty(this.next.code)) && (_.has(this.next, 'type') && !_.isEmpty(this.next.type))) {
        editor.session.setValue(this.next.code);
        editor.session.setMode('ace/mode/' + this.next.type.toLowerCase());
      }
    },

    /**
     * @method setSubmitValue
     * @desc To set submit value whenever editor is blur
     * @param {aceEditor} editor
     */
    setSubmitValue(editor) {
      const mode = editor.session.getMode().$id.match(/(?!(\/|\\))(?:\w)*$/g)[0];
      if (editor.getValue() !== this.next.code) {
        this.next.code = editor.getValue();
      }

      if ((editor.getValue().length > 0 || this.next.type.length > 0) && mode !== this.next.type) {
        this.next.type = mode;
      }
    },

    /**
     * @method editorEvents
     * @desc To register any Ace Editor Events
     * @param {aceEditor} editor
     */
    editorEvents(editor) {
      const self = this;
      // Set schema value onBlur event editor
      editor.on('blur', function () {
        // eslint-disable-next-line no-useless-call
        self.setSubmitValue.call(self, editor);
      });

      // When editor is on focus
      editor.on('focus', function () {
        // Remove Options Container if options container is on show class
        if (self.optionsClick) {
          self.optionsClick = false;
        }
      });
    }
  }
};
