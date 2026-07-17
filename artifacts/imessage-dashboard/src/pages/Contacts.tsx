import React, { useState } from "react";
import { 
  useGetContacts, 
  useCreateContact, 
  useUpdateContact, 
  useDeleteContact, 
  getGetContactsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Search, Plus, Edit2, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Contacts() {
  const { data: contacts, isLoading } = useGetContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{id: number, name: string, phoneNumber: string} | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const filteredContacts = contacts?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phoneNumber.includes(search)
  ) || [];

  const handleCreate = () => {
    if (!formName || !formPhone) {
      toast.error("Name and phone number are required");
      return;
    }
    createContact.mutate({
      data: { name: formName, phoneNumber: formPhone }
    }, {
      onSuccess: () => {
        toast.success("Contact registered successfully");
        setIsCreateOpen(false);
        setFormName("");
        setFormPhone("");
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
      },
      onError: (err) => {
        toast.error("Failed to register contact: " + (err.error?.error || "Unknown error"));
      }
    });
  };

  const handleEdit = () => {
    if (!editingContact || !formName || !formPhone) return;
    
    updateContact.mutate({
      id: editingContact.id,
      data: { name: formName, phoneNumber: formPhone }
    }, {
      onSuccess: () => {
        toast.success("Contact parameters updated");
        setIsEditOpen(false);
        setEditingContact(null);
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
      },
      onError: (err) => {
        toast.error("Failed to update contact");
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    
    deleteContact.mutate({ id }, {
      onSuccess: () => {
        toast.success("Contact deleted");
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to delete contact");
      }
    });
  };

  const openEdit = (contact: any) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormPhone(contact.phoneNumber);
    setIsEditOpen(true);
  };

  const openCreate = () => {
    setFormName("");
    setFormPhone("");
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            DIRECTORY
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage target identifiers</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              NEW CONTACT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                REGISTER CONTACT
              </DialogTitle>
              <DialogDescription className="text-xs font-mono uppercase">
                Add a new identifier to the system directory.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-xs font-mono uppercase text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="col-span-3 font-mono bg-input/50"
                  placeholder="e.g. Command Alpha"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right text-xs font-mono uppercase text-muted-foreground">
                  Identifier
                </Label>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="col-span-3 font-mono bg-input/50"
                  placeholder="e.g. +15551234567"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreate} disabled={createContact.isPending} className="font-mono">
                {createContact.isPending ? "SAVING..." : "SAVE"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/20 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search directory..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 font-mono text-sm bg-input/50 border-border focus-visible:ring-primary/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-mono flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Accessing directory...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4 border border-border">
              <Users className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-foreground font-medium text-lg">No identifiers found</h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">Directory query returned 0 results</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            <AnimatePresence>
              {filteredContacts.map((contact, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  key={contact.id}
                >
                  <Card className="bg-secondary/20 border-border hover:border-primary/30 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{contact.name}</h3>
                        <div className="flex items-center text-muted-foreground font-mono text-sm mt-1 gap-1.5">
                          <Phone className="w-3 h-3 text-primary" />
                          {contact.phoneNumber}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/50">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 flex-1 font-mono text-xs bg-secondary/30 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => openEdit(contact)}
                        >
                          <Edit2 className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleteContact.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              MODIFY CONTACT
            </DialogTitle>
            <DialogDescription className="text-xs font-mono uppercase">
              Update directory entry parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right text-xs font-mono uppercase text-muted-foreground">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="col-span-3 font-mono bg-input/50"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right text-xs font-mono uppercase text-muted-foreground">
                Identifier
              </Label>
              <Input
                id="edit-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="col-span-3 font-mono bg-input/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleEdit} disabled={updateContact.isPending} className="font-mono">
              {updateContact.isPending ? "UPDATING..." : "UPDATE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
