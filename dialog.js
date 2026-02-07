/**
 * DraftBridge Gold - Dialog Window Logic
 *
 * Handles form dialog windows opened from the taskpane.
 * Used by dialog.html for template forms (demand letter, motion to dismiss, etc.).
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

/* global Office, Word */

(function () {
  'use strict';

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  Office.onReady(function (info) {
    // Determine which form to show based on URL parameters
    const params = new URLSearchParams(window.location.search);
    const formType = params.get('type') || 'generic';
    const title = params.get('title') || 'Form';

    // Set dialog title
    const titleEl = document.getElementById('formTitle');
    if (titleEl) titleEl.textContent = title;

    // Show the appropriate form
    showForm(formType);
  });

  // ============================================================================
  // FORM DISPLAY
  // ============================================================================

  /**
   * Show the form matching the given type, hide all others.
   * @param {string} type - form identifier (e.g. 'demand-letter', 'motion-to-dismiss')
   */
  function showForm(type) {
    // Hide all form sections
    var forms = document.querySelectorAll('.form-content');
    for (var i = 0; i < forms.length; i++) {
      forms[i].classList.add('hidden');
    }

    // Show the target form, or fallback to generic
    var target = document.getElementById('form-' + type);
    if (target) {
      target.classList.remove('hidden');
    } else {
      var generic = document.getElementById('form-generic');
      if (generic) generic.classList.remove('hidden');
    }
  }

  // ============================================================================
  // PREVIEW
  // ============================================================================

  /**
   * Refresh the document preview pane (placeholder implementation).
   */
  function refreshPreview() {
    var previewContent = document.getElementById('previewContent');
    if (!previewContent) return;

    previewContent.innerHTML =
      '<div class="preview-placeholder">' +
      '<p>Preview updated.</p>' +
      '</div>';
  }

  // ============================================================================
  // DIALOG ACTIONS
  // ============================================================================

  /**
   * Close the dialog window. Sends a message to the parent taskpane.
   */
  function closeDialog() {
    Office.context.ui.messageParent(JSON.stringify({ action: 'close' }));
  }

  /**
   * Collect form data and send to the parent taskpane for document insertion.
   */
  function insertDocument() {
    var formData = collectFormData();

    Office.context.ui.messageParent(
      JSON.stringify({ action: 'insert', data: formData })
    );
  }

  /**
   * Collect all visible form field values into a key-value object.
   * @returns {Object} form data
   */
  function collectFormData() {
    var data = {};
    var visibleForm = document.querySelector('.form-content:not(.hidden)');
    if (!visibleForm) return data;

    var inputs = visibleForm.querySelectorAll(
      'input, textarea, select'
    );
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (!el.id) continue;

      if (el.type === 'checkbox') {
        data[el.id] = el.checked;
      } else {
        data[el.id] = el.value;
      }
    }

    return data;
  }

  // ============================================================================
  // EXPOSE TO GLOBAL SCOPE (for onclick handlers in dialog.html)
  // ============================================================================

  window.closeDialog = closeDialog;
  window.refreshPreview = refreshPreview;
  window.insertDocument = insertDocument;
})();
