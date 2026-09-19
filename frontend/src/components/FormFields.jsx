import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const FormField = ({ label, id, children }) => <div className="form-field"><label htmlFor={id}>{label}</label>{children}</div>;
export const TextField = ({ label, id, multiline, ...props }) => <FormField label={label} id={id}>{multiline ? <Textarea id={id} data-testid={id} className="lux-input" {...props} /> : <Input id={id} data-testid={id} className="lux-input" {...props} />}</FormField>;
export const SelectField = ({ label, id, options, placeholder, ...props }) => <FormField label={label} id={id}><select id={id} data-testid={id} className="lux-input" {...props}>{placeholder && <option value="">{placeholder}</option>}{options.map((option) => <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>{typeof option === 'string' ? option : option.label}</option>)}</select></FormField>;
