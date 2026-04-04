pdf-viewer is a stand alone web component like browser-window, code-block, code-playground, and others.  The components use CSS variables for deep theme support and work with vanilla breeze but are stand alone.  
The components use custom events and are frame work agnostic.  The component follows the same repository patterns with JSDocs, a doc site, heavy unit and playwright testing and best practices established elsewhere.  Actual viewing of PDFs can be performed by dependencies this component coordinates, wraps, and controls.  This makes it like code-block and code-playground which very much rely on other things

All source here is local, but once figured out it will be pushed to Github in the ProfPowell account

See ~/src/browser-window, ~/src/vanilla-breeze, ~/src/code-block, ~src/code-playground for patterns
