import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

export const errorDetails = reference =>
  client.get(encodePath('api', 'admin', 'errors', reference));
