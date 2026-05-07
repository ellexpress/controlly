import { emailException } from "@ellenode/faily";
import { Mail } from "@ellenode/maily";

/**
 * Middleware function that wraps a given controller function in a transaction,
 * handles errors, and sends error notification emails in production environments.
 *
 * @param {Function} controller - The controller function to execute.
 * @returns {Function} - An asynchronous function to handle the request, response, and next middleware.
 *
 * The function attempts to execute the provided controller function. If an error occurs,
 * it rolls back the transaction if it hasn't been completed, logs the error details,
 * and if the application environment is set to production, sends an email notification
 * with the error details. Finally, it sends a 500 status response with the error message
 * to the client.
 * 
 * @example
 * ```javascript
 * import { controller } from 'controlly';
 * const router = express.Router();
 * router.get('/api/users', controller(listUsersController));
 * ```
 */
export const controller = (controller) => {
    return async (req, response, next) => {

        try {
            return await controller(req, response, next);
        } catch (error) {
            if (req?.transaction && req?.transaction?.finished === undefined) {
                await req.transaction.rollback();
            }

            // Obtiene los entornos en donde si se podría mandar correo, por defecto son entornos de producción
            let environments = [];
            if (process.env.MAIL_EXCEPTION_ENVIRONMENTS) {
                environments = process.env.MAIL_EXCEPTION_ENVIRONMENTS
                    .split(',')
                    .map(e => e.trim().toLowerCase());
            } else {
                environments = ['prod', 'prd', 'production'];
            }

            // Solo para entornos de producción envía un correo
            if (environments.includes(process.env.APP_ENVIRONMENT)) {
                try {
                    emailException(error, {
                        ENDPOINT: req.protocol + '://' + req.get('host') + req.originalUrl,
                        BODY: req.body
                    });
                } catch (mailError) {
                    console.error(mailError);
                }
            }

            console.error(error.stack);

            // Dejar que Express maneje el error
            return next(error);
        }
    };
};