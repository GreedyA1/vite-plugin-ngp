/**
 * The codes of Angular's extended diagnostics, the template checks `extendedDiagnostics` in
 * `angularCompilerOptions` configures. Not a range: NG8110 is an ordinary error,
 * `controlFlowPreventingContentProjection` is NG8011 and `deferTriggerMisconfiguration` is NG8021.
 * These are the names in ngp's `SUPPORTED_DIAGNOSTIC_NAMES`: the two option-only checks, NG8011
 * and `unusedStandaloneImports` (NG8113), which ngp runs outside its `ALL_DIAGNOSTIC_FACTORIES`,
 * the factories, and the four checks Angular has and ngp doesn't run yet (NG8102, NG8107, NG8115,
 * NG8117). test/extended-diagnostics.test.mjs fails when ngp's list moves.
 */
export const EXTENDED_DIAGNOSTIC_CODES: ReadonlySet<number> = new Set([
  8011, // controlFlowPreventingContentProjection
  8021, // deferTriggerMisconfiguration
  8101, // invalidBananaInBox
  8102, // nullishCoalescingNotNullable, not run by ngp yet
  8103, // missingControlFlowDirective
  8104, // textAttributeNotBinding
  8105, // missingNgForOfLet
  8106, // suffixNotSupported
  8107, // optionalChainNotNullable, not run by ngp yet
  8108, // skipHydrationNotStatic
  8109, // interpolatedSignalNotInvoked
  8111, // uninvokedFunctionInEventBinding
  8112, // unusedLetDeclaration
  8113, // unusedStandaloneImports
  8114, // unparenthesizedNullishCoalescing
  8115, // uninvokedTrackFunction, not run by ngp yet
  8116, // missingStructuralDirective
  8117, // uninvokedFunctionInTextInterpolation, not run by ngp yet
  8119, // numericCssPropertyRequiresUnit
]);
