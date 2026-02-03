import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useContacts } from '@/hooks/use-contacts';
import { useCreateDeal, PIPELINE_STAGES } from '@/hooks/use-pipeline';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  contact_id: z.string().min(1, 'Please select a contact'),
  deal_value: z.coerce.number().min(0, 'Deal value must be positive'),
  pipeline_stage: z.string().min(1, 'Please select a stage'),
  priority: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateDealDialogProps {
  trigger?: React.ReactNode;
  defaultStage?: string;
}

export function CreateDealDialog({ trigger, defaultStage = 'new_lead' }: CreateDealDialogProps) {
  const [open, setOpen] = useState(false);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const { toast } = useToast();
  const { data: contacts, isLoading: contactsLoading } = useContacts('all', contactSearch);
  const createDeal = useCreateDeal();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: '',
      deal_value: 0,
      pipeline_stage: defaultStage,
      priority: 'normal',
    },
  });

  const selectedContact = contacts?.find(c => c.id === form.watch('contact_id'));

  const onSubmit = async (values: FormValues) => {
    try {
      await createDeal.mutateAsync({
        contactId: values.contact_id,
        dealValue: values.deal_value,
        pipelineStage: values.pipeline_stage,
        priority: values.priority || 'normal',
      });

      toast({
        title: 'Deal created',
        description: 'The deal has been added to your pipeline.',
      });

      form.reset();
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create deal',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return phone.slice(-2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Add a new deal to your sales pipeline. Select a contact to get started.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contact Selection */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contact</FormLabel>
                  <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={contactPopoverOpen}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {selectedContact ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={selectedContact.profile_picture_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(selectedContact.display_name, selectedContact.phone_number)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {selectedContact.display_name || selectedContact.phone_number}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              <span>Select a contact...</span>
                            </div>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {contactsLoading ? 'Loading...' : 'No contacts found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {contacts?.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.id}
                                onSelect={() => {
                                  form.setValue('contact_id', contact.id);
                                  setContactPopoverOpen(false);
                                  setContactSearch('');
                                }}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={contact.profile_picture_url || undefined} />
                                    <AvatarFallback>
                                      {getInitials(contact.display_name, contact.phone_number)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {contact.display_name || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {contact.phone_number}
                                    </p>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deal Value */}
            <FormField
              control={form.control}
              name="deal_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min={0}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pipeline Stage */}
            <FormField
              control={form.control}
              name="pipeline_stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', stage.color)} />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDeal.isPending}>
                {createDeal.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
