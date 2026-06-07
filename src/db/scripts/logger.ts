import chalk from 'chalk';

/**
 * CLI-specific logger for the Baseraa seeder system (`db/scripts/`).
 *
 * This is intentionally separate from the app-wide pino logger (`utils/logger.ts`).
 * The seeder scripts run as standalone CLI commands (`npx tsx db/scripts/cli.ts`),
 * not inside the Next.js runtime, so they need colored terminal output with
 * checkmarks, tables, and a `--verbose` toggle — not structured JSON.
 *
 * Log level semantics:
 * - `info(msg)`:    Key operation milestones (e.g., "Bootstrapping money module"). Always visible.
 * - `success(msg)`: Operation completed successfully. Always visible.
 * - `warn(msg)`:    Non-fatal issues (e.g., table doesn't exist during teardown). Always visible.
 * - `error(msg)`:   Fatal errors. Always visible.
 * - `detail(msg)`:  Row counts, IDs, per-record progress. Only visible with `--verbose`.
 * - `table(rows)`:  Summary tables (SeedResult aggregation). Always visible.
 *
 * Scripts must NOT:
 * - Use `console.log()` directly — always go through `logger`
 * - Call `Logger.setGlobalVerbose()` at module level
 * - Use `logger.info()` for per-record details (use `logger.detail()` instead)
 * - Use `logger.detail()` for key milestones (use `logger.info()` instead)
 */
export class Logger {
  private static globalVerbose = false;
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /** Set verbose mode globally. Should be called once at CLI startup. */
  static setGlobalVerbose(verbose: boolean) {
    Logger.globalVerbose = verbose;
  }

  private shouldShowDetail(): boolean {
    return this.verbose || Logger.globalVerbose;
  }

  /** Log a key operation milestone. Always visible. */
  info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  /** Log a successful operation. Always visible. */
  success(message: string) {
    console.log(chalk.green('✓'), message);
  }

  /** Log a fatal error. Always visible. */
  error(message: string) {
    console.log(chalk.red('✗'), message);
  }

  /** Log a non-fatal warning. Always visible. */
  warn(message: string) {
    console.log(chalk.yellow('⚠'), message);
  }

  header(message: string) {
    console.log(chalk.bold.blue(message));
  }

  subheader(message: string) {
    console.log(chalk.bold(message));
  }

  /** Log verbose-only detail (row counts, IDs, per-record progress). Only visible with `--verbose`. */
  detail(message: string) {
    if (this.shouldShowDetail()) {
      console.log(chalk.gray(`  ${message}`));
    }
  }

  newline() {
    console.log();
  }

  // Operation logging - simplified
  startOperation(operation: string) {
    console.log(chalk.blue(`Starting ${operation}...`));
  }

  completeOperation(operation: string, details?: string) {
    console.log(chalk.green(`Completed ${operation}`));
    if (details && this.verbose) {
      console.log(chalk.gray(`  ${details}`));
    }
  }

  failOperation(operation: string, error?: string) {
    console.log(chalk.red(`Failed ${operation}`));
    if (error) {
      console.log(chalk.red(`  ${error}`));
    }
  }

  /** Render a summary table of seed results. Always visible. */
  table(
    rows: Array<{ module: string; inserted: number; skipped: number }>
  ): void {
    console.table(
      rows.map((r) => ({
        Module: r.module,
        Inserted: r.inserted,
        Skipped: r.skipped,
      }))
    );
  }
}

// Default logger instance
export const logger = new Logger();
