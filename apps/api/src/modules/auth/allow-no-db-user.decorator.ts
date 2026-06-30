import { SetMetadata } from '@nestjs/common';

export const ALLOW_NO_DB_USER_KEY = 'allowNoDbUser';
export const AllowNoDbUser = () => SetMetadata(ALLOW_NO_DB_USER_KEY, true);
