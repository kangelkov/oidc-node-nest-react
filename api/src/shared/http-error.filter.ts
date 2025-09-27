import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | undefined = 'internal_error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const r = exception.getResponse();
            if (typeof r === 'string') message = r;
            else if (r && typeof r === 'object') {
                const any = r as any;
                if (Array.isArray(any.message) && any.message.length) message = any.message[0];
                else if (any.message) message = any.message;
                else if (any.error) message = any.error;
            }
        }

        if (status === 400 && message) {
            if (typeof message === 'string' && message.includes('should not be empty')) {
                message = message.replace('should not be empty', 'is required');
            }
        }

        res.status(status).json({ error: message, path: req.url });
    }
}
