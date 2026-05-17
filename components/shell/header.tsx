"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, Menu, ChevronDown, LogOut, KeyRound, Users, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Logomark } from "./logomark";

interface NavItem {
  href: string;
  label: string;
}

export interface HeaderProps {
  email: string;
  navItems: NavItem[];
  /** Se true, mostra item "Usuários" no dropdown do email + menu mobile. */
  isAdmin: boolean;
  modoNomeIniciais: boolean;
  alternarModoNomeAction: () => void | Promise<void>;
  signOutAction: () => void | Promise<void>;
}

export function Header({
  email,
  navItems,
  isAdmin,
  modoNomeIniciais,
  alternarModoNomeAction,
  signOutAction,
}: HeaderProps) {
  const pathname = usePathname() || "/";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 bg-navy-900 text-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity"
        >
          <Logomark />
          <span className="hidden sm:inline">WRE Simulador</span>
          <span className="hidden md:inline text-peri-200 font-normal text-sm">· DSF</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                isActive(item.href)
                  ? "bg-navy-700 text-white"
                  : "text-peri-100 hover:text-white hover:bg-navy-800",
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle modo nome */}
          <form action={alternarModoNomeAction}>
            <Tooltip
              content={
                modoNomeIniciais
                  ? "Mostrando iniciais — clique para revelar nomes completos"
                  : "Mostrando nomes — clique para anonimizar"
              }
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-peri-100 hover:bg-navy-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400"
                aria-label={modoNomeIniciais ? "Revelar nomes" : "Anonimizar nomes"}
              >
                {modoNomeIniciais ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{modoNomeIniciais ? "Anônimo" : "Nomes"}</span>
              </button>
            </Tooltip>
          </form>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-peri-100 hover:bg-navy-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri-400">
                <span className="max-w-[160px] truncate">{email}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil/senha" className="flex items-center gap-2 w-full">
                  <KeyRound className="h-3.5 w-3.5" />
                  Trocar senha
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/usuarios" className="flex items-center gap-2 w-full">
                    <Users className="h-3.5 w-3.5" />
                    Usuários
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild destructive>
                <form action={signOutAction} className="contents">
                  <button
                    type="submit"
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sair
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Drawer mobile */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-peri-100 hover:bg-navy-800 hover:text-white"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              hideClose
              className="left-auto right-0 top-0 translate-x-0 translate-y-0 h-screen max-w-xs w-full rounded-none bg-navy-900 text-white border-navy-700 p-0"
            >
              <div className="flex items-center justify-between p-4 border-b border-navy-700">
                <span className="font-semibold flex items-center gap-2">
                  <Logomark /> WRE Simulador
                </span>
                <DialogClose
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-navy-800"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
              <nav className="flex flex-col p-2" aria-label="Menu mobile">
                {navItems.map((item) => (
                  <DialogClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "px-3 py-2.5 rounded-md text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-navy-700 text-white"
                          : "text-peri-100 hover:bg-navy-800 hover:text-white",
                      )}
                    >
                      {item.label}
                    </Link>
                  </DialogClose>
                ))}
                <hr className="my-2 border-navy-700" />
                <DialogClose asChild>
                  <Link
                    href="/perfil/senha"
                    className="px-3 py-2.5 rounded-md text-sm text-peri-100 hover:bg-navy-800 hover:text-white flex items-center gap-2"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Trocar senha
                  </Link>
                </DialogClose>
                {isAdmin && (
                  <DialogClose asChild>
                    <Link
                      href="/usuarios"
                      className="px-3 py-2.5 rounded-md text-sm text-peri-100 hover:bg-navy-800 hover:text-white flex items-center gap-2"
                    >
                      <Users className="h-3.5 w-3.5" /> Usuários
                    </Link>
                  </DialogClose>
                )}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full text-left px-3 py-2.5 rounded-md text-sm text-peri-100 hover:bg-navy-800 hover:text-white flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </form>
                <div className="px-3 py-2 text-xs text-peri-300 truncate">{email}</div>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
