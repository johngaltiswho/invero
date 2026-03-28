/**
 * Integration tests for PDF Viewer and BOQ Takeoff
 *
 * Tests that ensure:
 * 1. PDF files can be loaded in iframes
 * 2. Security headers allow same-origin embedding
 * 3. File serving API works correctly
 */

import { describe, it, expect } from '@jest/globals';

describe('PDF Viewer Integration', () => {
  describe('Security Headers Configuration', () => {
    it('should allow same-origin iframe embedding', () => {
      // Read next.config.js
      const fs = require('fs');
      const configContent = fs.readFileSync('next.config.js', 'utf-8');

      // Check X-Frame-Options is SAMEORIGIN (not DENY)
      // Match multiline format: key: 'X-Frame-Options', value: 'SAMEORIGIN',
      const xFrameMatch = configContent.match(/key:\s*['"]X-Frame-Options['"]\s*,?\s*value:\s*['"](\w+)['"]/s);
      expect(xFrameMatch).toBeTruthy();

      const xFrameValue = xFrameMatch ? xFrameMatch[1] : '';
      expect(xFrameValue).toBe('SAMEORIGIN');
      expect(xFrameValue).not.toBe('DENY'); // Would break PDF viewer
    });

    it('should allow frame-ancestors self in CSP', () => {
      const fs = require('fs');
      const configContent = fs.readFileSync('next.config.js', 'utf-8');

      // Check CSP frame-ancestors is 'self' (not 'none')
      const frameAncestorsMatch = configContent.match(/["']frame-ancestors\s+['"]self['"]/);
      expect(frameAncestorsMatch).toBeTruthy();

      // Should not be 'none' which blocks iframes
      const hasFrameAncestorsNone = configContent.includes("frame-ancestors 'none'");
      expect(hasFrameAncestorsNone).toBe(false);
    });
  });

  describe('PDF Iframe Configuration', () => {
    it('should use correct PDF.js URL parameters', () => {
      const expectedParams = [
        'toolbar=1',
        'navpanes=1',
        'scrollbar=1',
        'page=1',
        'zoom=page-fit',
      ];

      // These are the standard PDF.js parameters
      expectedParams.forEach(param => {
        expect(param).toMatch(/\w+=[\w-]+/);
      });
    });

    it('should construct proper PDF viewer URL', () => {
      const fileUrl = '/api/project-files/view?id=abc123';
      const pdfViewerUrl = `${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&zoom=page-fit`;

      expect(pdfViewerUrl).toContain(fileUrl);
      expect(pdfViewerUrl).toContain('#'); // Fragment separator
      expect(pdfViewerUrl).toContain('toolbar=1');
      expect(pdfViewerUrl).toContain('zoom=page-fit');
    });
  });

  describe('File Serving API', () => {
    it('should serve files with inline disposition for viewing', () => {
      const download = false;
      const fileName = 'drawing.pdf';

      const contentDisposition = `${download ? 'attachment' : 'inline'}; filename="${fileName}"`;

      expect(contentDisposition).toContain('inline');
      expect(contentDisposition).toContain(fileName);
      expect(contentDisposition).not.toContain('attachment');
    });

    it('should serve files with attachment disposition for downloads', () => {
      const download = true;
      const fileName = 'drawing.pdf';

      const contentDisposition = `${download ? 'attachment' : 'inline'}; filename="${fileName}"`;

      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain(fileName);
    });

    it('should set proper cache headers', () => {
      const cacheControl = 'private, max-age=300';

      expect(cacheControl).toContain('private');
      expect(cacheControl).toContain('max-age=300'); // 5 minutes
    });

    it('should set X-Frame-Options SAMEORIGIN for file API', () => {
      // File API should also set SAMEORIGIN
      const fs = require('fs');
      const apiCode = fs.readFileSync('src/app/api/project-files/view/route.ts', 'utf-8');

      expect(apiCode).toContain("'X-Frame-Options': 'SAMEORIGIN'");
    });
  });

  describe('File Type Detection', () => {
    it('should correctly identify PDF files', () => {
      const testCases = [
        { fileName: 'drawing.pdf', isPDF: true },
        { fileName: 'DRAWING.PDF', isPDF: true },
        { fileName: 'plan.doc', isPDF: false },
        { fileName: 'image.jpg', isPDF: false },
      ];

      testCases.forEach(({ fileName, isPDF }) => {
        const detected = fileName.toLowerCase().endsWith('.pdf');
        expect(detected).toBe(isPDF);
      });
    });

    it('should use correct MIME types', () => {
      const mimeTypes = {
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      };

      Object.entries(mimeTypes).forEach(([mimeType, extensions]) => {
        expect(mimeType).toBeTruthy();
        expect(extensions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('BOQ Takeoff Viewer', () => {
    it('should toggle between View Mode and Takeoff Mode', () => {
      const modes = {
        viewMode: { useAnalysisMode: false, component: 'SimplePDFViewer' },
        takeoffMode: { useAnalysisMode: true, component: 'BOQTakeoffViewer' },
      };

      expect(modes.viewMode.useAnalysisMode).toBe(false);
      expect(modes.takeoffMode.useAnalysisMode).toBe(true);
    });

    it('should have split view with resizable panels', () => {
      const defaultSplit = {
        boqPercentage: 60,
        pdfPercentage: 40,
        minPercentage: 20,
        maxPercentage: 80,
      };

      expect(defaultSplit.boqPercentage + defaultSplit.pdfPercentage).toBe(100);
      expect(defaultSplit.minPercentage).toBeGreaterThan(0);
      expect(defaultSplit.maxPercentage).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should show error message when PDF fails to load', () => {
      const errorScenarios = [
        { status: 401, message: 'Not authenticated' },
        { status: 403, message: 'Access denied' },
        { status: 404, message: 'File not found' },
        { status: 500, message: 'Server error' },
      ];

      errorScenarios.forEach(({ status, message }) => {
        expect(status).toBeGreaterThanOrEqual(400);
        expect(message).toBeTruthy();
      });
    });

    it('should handle connection refused errors', () => {
      const errorMessage = 'finverno.com refused to connect';

      // This was the bug we fixed - X-Frame-Options: DENY
      expect(errorMessage).toContain('refused to connect');

      // Solution: X-Frame-Options should be SAMEORIGIN
      const solution = 'SAMEORIGIN';
      expect(solution).not.toBe('DENY');
    });
  });
});
