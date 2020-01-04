export default {
  template: `
    <!-- TODO tapping to close below the dialog doesn't work, on short screens -->
    <div class="dialog-container overlay" @click="showing=false" v-show="showing">
      <div id="format-guide" class="dialog" @click.stop>
        <p>Here's how to do bold, italics, and other things.</p>
        <ul>
          <li>Use <code><em>underscores</em></code> or <code>/slashes/</code> to <em>italicize text.</em></li>
          <li>Use <code><strong>two underscores</strong></code> to <strong>bold text.</strong></li>
          <li>Use <code><strong><em>three underscores</em></strong></code> to <strong><em>do both.</em></strong></li>
          <li>Use <code><del>two tildes</del></code> to <del>strike out text</del>.</li>
          <li><code><em>Asterisks</em></code> denote an action done by a character.</li>
          <li>Pressing <code>Enter</code> will send your message. To disable this, uncheck the &quot;Press enter to send&quot; option
            in the menu.<ul>
          <li><code>Shift + Enter</code> will always start a new paragraph, regardless of this setting.</li>
          <li>On the other hand, <code>Ctrl + Enter</code> will always send the message.</li>
            </ul>
          </li>
        </ul>
        <h4>Shortcuts</h4>
        <p>Use these shortcuts to RP faster.</p>
        <ul>
          <li>Quickly write an OOC message by using one of these methods:
            <ul>
              <li><code>(( inside two parentheses ))</code></li>
              <li><code>{ inside one or more braces }</code></li>
              <li><code>// following two slashes</code></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  `,
  data() {
    return {
     showing: false,
    }
  },
  methods: {
    open() {
      this.showing = true;
    }
  }
}
