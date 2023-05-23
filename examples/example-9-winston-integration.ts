import { makeCaughtObjectReportJson } from '../src';
import { createLogger, transports, ExceptionHandler } from 'winston';

const origGetAllInfo = ExceptionHandler.prototype.getAllInfo;
ExceptionHandler.prototype.getAllInfo = function getAllInfoExtended(
  err: unknown,
): object {
  const errorInfoByWinston = origGetAllInfo.call(
    ExceptionHandler.prototype,
    err instanceof Error
      ? err
      : `I'm a hacky stub error that does not break getAllInfo method, unlike undefined or null.`,
  );
  return {
    ...errorInfoByWinston,
    error: err,
    message: makeCaughtObjectReportJson(err),
  };
};

const logger = createLogger({
  transports: [new transports.Console()],
  exceptionHandlers: [new transports.Console()],
});

logger.info({ 'just-an-info-message': 'hey' });

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
throw new AggregateError([new Error('cause 1'), new Error('cause 2'), null]);
