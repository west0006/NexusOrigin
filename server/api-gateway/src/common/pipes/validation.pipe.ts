import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
    async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }
        const object = plainToClass(metatype, value);
        const errors = await validate(object, {
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
        });

        if (errors.length > 0) {
            const messages = errors.map((err) => {
                const constraints = err.constraints ?? {};
                const reasons = Object.values(constraints).join('; ');
                const childErrors =
                    err.children?.map((child) => {
                        const c = child.constraints ?? {};
                        return Object.values(c).join('; ');
                    }) ?? [];
                return {
                    field: err.property,
                    messages: [...(reasons ? [reasons] : []), ...childErrors],
                };
            });
            throw new BadRequestException({
                statusCode: 400,
                error: 'Validation Failed',
                details: messages,
            });
        }
        return object;
    }

    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
}