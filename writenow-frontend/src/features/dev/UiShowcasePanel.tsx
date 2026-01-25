/**
 * UiShowcasePanel
 * Why: Provide a lightweight in-app surface to validate shadcn/ui components with Design Tokens
 * (required by Sprint Frontend V2 P0-003 task card).
 */

import { useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

/**
 * Minimal component gallery used during development and CI validation.
 */
export function UiShowcasePanel() {
  const [enabled, setEnabled] = useState(false);
  const [value, setValue] = useState('option-1');

  return (
    <div className="h-full w-full bg-[var(--bg-editor)] p-4 overflow-auto">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">组件展示（shadcn/ui）</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            该面板用于验证基础组件是否正确使用 Design Tokens，并确保键盘交互可用。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Variants + focus styles</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Input / Textarea</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Type something…" />
            <Textarea placeholder="Multiline…" rows={4} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overlays</CardTitle>
            <CardDescription>Dialog / Popover / Dropdown / Tooltip</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog Title</DialogTitle>
                  <DialogDescription>Dialog description using tokens.</DialogDescription>
                </DialogHeader>
                <div className="text-sm text-[var(--text-secondary)]">Content…</div>
                <DialogFooter>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                  <Button type="button">Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="text-sm font-medium text-[var(--text-primary)]">Popover</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">Small info box.</div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Action 1</DropdownMenuItem>
                <DropdownMenuItem>Action 2</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Action 3</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>Hint text</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selectors</CardTitle>
            <CardDescription>Select / Switch / Tabs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56">
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option-1">Option 1</SelectItem>
                    <SelectItem value="option-2">Option 2</SelectItem>
                    <SelectItem value="option-3">Option 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={setEnabled} />
                <span className="text-sm text-[var(--text-secondary)]">{enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="tab-1">
              <TabsList>
                <TabsTrigger value="tab-1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab-2">Tab 2</TabsTrigger>
              </TabsList>
              <TabsContent value="tab-1">
                <div className="text-sm text-[var(--text-secondary)]">Tab content 1</div>
              </TabsContent>
              <TabsContent value="tab-2">
                <div className="text-sm text-[var(--text-secondary)]">Tab content 2</div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-[var(--text-muted)]">Current select value: {value}</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default UiShowcasePanel;

