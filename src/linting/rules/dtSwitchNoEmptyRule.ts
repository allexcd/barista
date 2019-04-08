import { ElementAst } from '@angular/compiler';
import { BasicTemplateAstVisitor, NgWalker } from 'codelyzer';
import { IRuleMetadata, RuleFailure, Rules } from 'tslint';
import { SourceFile } from 'typescript';
import { hasContent, hasTextContentAlternative } from '../helpers';

// tslint:disable-next-line:max-classes-per-file
class DtSwitchVisitor extends BasicTemplateAstVisitor {

  // tslint:disable-next-line no-any
  visitElement(element: ElementAst, context: any): any {
    this._validateElement(element);
    super.visitElement(element, context);
  }

  // tslint:disable-next-line no-any
  private _validateElement(element: ElementAst): any {
    if (element.name !== 'dt-switch') {
      return;
    }

    if (
      hasContent(element) ||
      hasTextContentAlternative(element)
    ) {
      return;
    }

    const startOffset = element.sourceSpan.start.offset;
    const endOffset = element.sourceSpan.end.offset;
    this.addFailureFromStartToEnd(startOffset, endOffset, 'When a dt-switch does not contain any content it must have an aria-label or an aria-labelledby attribute.');
  }
}

/**
 * The dtSwitchNoEmptyRule ensures that a switch always has a text or an aria-label as alternative.
 *
 * The following example passes the lint checks:
 * <dt-switch>Subscribe to newsletter</dt-switch>
 * <dt-switch aria-label="When checked you agree to subscribe to our newsletter."></dt-switch>
 *
 * For the following example the linter throws errors:
 * <dt-switch></dt-switch>
 */
export class Rule extends Rules.AbstractRule {

  static readonly metadata: IRuleMetadata = {
    description: 'Ensures that a switch always contains content or an aria-label as alternative.',
    // tslint:disable-next-line no-null-keyword
    options: null,
    optionsDescription: 'Not configurable.',
    rationale: 'A switch without content must have an aria-label or aria-labelledby attribute.',
    ruleName: 'dt-switch-no-empty',
    type: 'maintainability',
    typescriptOnly: true,
  };

  apply(sourceFile: SourceFile): RuleFailure[] {
    return this.applyWithWalker(
      new NgWalker(sourceFile, this.getOptions(), {
        templateVisitorCtrl: DtSwitchVisitor,
      }),
    );
  }
}