import { l } from '../../i18n/l10n';
import type { Module } from '../types';

export const m22: Module = {
  id: 'binarnie',
  level: 2,
  icon: 'binary',
  minutes: 14,
  title: l('Liczby binarne i szesnastkowe', 'Binary and hexadecimal numbers'),
  summary: l(
    'Jak liczy komputer: bity, wartości miejsc 128-1, zamiana w obie strony i system szesnastkowy w MAC i IPv6.',
    'How computers count: bits, place values 128-1, converting both ways and hexadecimal in MAC and IPv6.',
  ),
  labs: [],
  games: ['binarny-sprint'],
  sections: [
    {
      id: 'bity',
      title: l('Osiem bitów, jeden oktet', 'Eight bits, one octet'),
      body: {
        pl: [
          { t: 'p', text: 'Komputer zna tylko dwie cyfry: 0 i 1. Adres IPv4 to 32 bity podzielone na cztery **oktety** po 8 bitów. Każdy bit w oktecie ma swoją wagę, od lewej: 128, 64, 32, 16, 8, 4, 2, 1.' },
          {
            t: 'table',
            head: ['Waga', '128', '64', '32', '16', '8', '4', '2', '1', 'Wynik'],
            rows: [
              ['bity', '1', '1', '0', '0', '0', '0', '0', '0', '**192**'],
              ['bity', '1', '0', '1', '0', '1', '0', '0', '0', '**168**'],
              ['bity', '0', '0', '0', '0', '1', '0', '1', '0', '**10**'],
              ['bity', '1', '1', '1', '1', '1', '1', '1', '1', '**255**'],
            ],
          },
          { t: 'p', text: 'Liczysz, dodając wagi tam, gdzie stoi jedynka. `11000000` to 128 + 64 = 192. Największa wartość oktetu to 255, bo wszystkie bity są jedynkami.' },
        ],
        en: [
          { t: 'p', text: 'A computer knows only two digits: 0 and 1. An IPv4 address is 32 bits split into four **octets** of 8 bits. Each bit in an octet has a weight, from the left: 128, 64, 32, 16, 8, 4, 2, 1.' },
          {
            t: 'table',
            head: ['Weight', '128', '64', '32', '16', '8', '4', '2', '1', 'Result'],
            rows: [
              ['bits', '1', '1', '0', '0', '0', '0', '0', '0', '**192**'],
              ['bits', '1', '0', '1', '0', '1', '0', '0', '0', '**168**'],
              ['bits', '0', '0', '0', '0', '1', '0', '1', '0', '**10**'],
              ['bits', '1', '1', '1', '1', '1', '1', '1', '1', '**255**'],
            ],
          },
          { t: 'p', text: 'You count by adding the weights where there is a one. `11000000` is 128 + 64 = 192. The largest octet value is 255 because all bits are ones.' },
        ],
      },
    },
    {
      id: 'zamiana',
      title: l('Zamiana dziesiętnej na binarną', 'Decimal to binary'),
      body: {
        pl: [
          { t: 'p', text: 'Najszybsza metoda dla oktetów to **odejmowanie wag**. Idziesz od 128 w dół. Jeśli waga mieści się w liczbie, piszesz 1 i odejmujesz. Jeśli nie, piszesz 0.' },
          {
            t: 'list',
            ordered: true,
            items: ['Liczba 172. Czy 128 się mieści? Tak: 1, zostaje 44.', '64 w 44? Nie: 0.', '32 w 44? Tak: 1, zostaje 12.', '16 w 12? Nie: 0.', '8 w 12? Tak: 1, zostaje 4.', '4 w 4? Tak: 1, zostaje 0.', '2 i 1: zera. Wynik: `10101100`.'],
          },
          { t: 'callout', kind: 'tip', title: 'Maski do zapamiętania', text: 'W maskach jedynki stoją zawsze od lewej. Wystarczy znać: 128, 192, 224, 240, 248, 252, 254, 255. To 1, 2, 3 ... 8 jedynek w oktecie.' },
        ],
        en: [
          { t: 'p', text: 'The fastest method for octets is **subtracting weights**. Go from 128 down. If the weight fits into the number, write 1 and subtract. If not, write 0.' },
          {
            t: 'list',
            ordered: true,
            items: ['Number 172. Does 128 fit? Yes: 1, 44 left.', '64 into 44? No: 0.', '32 into 44? Yes: 1, 12 left.', '16 into 12? No: 0.', '8 into 12? Yes: 1, 4 left.', '4 into 4? Yes: 1, 0 left.', '2 and 1: zeros. Result: `10101100`.'],
          },
          { t: 'callout', kind: 'tip', title: 'Masks to memorize', text: 'In masks the ones always start from the left. Just know: 128, 192, 224, 240, 248, 252, 254, 255. That is 1, 2, 3 ... 8 ones in an octet.' },
        ],
      },
    },
    {
      id: 'hex',
      title: l('System szesnastkowy', 'Hexadecimal'),
      body: {
        pl: [
          { t: 'p', text: 'System szesnastkowy (hex) ma cyfry 0-9 i A-F (A = 10, F = 15). Jedna cyfra hex to dokładnie 4 bity, więc bajt to dwie cyfry. Dlatego adresy MAC i IPv6 zapisuje się w hex.' },
          {
            t: 'table',
            head: ['Dziesiętnie', 'Binarnie', 'Hex'],
            rows: [
              ['10', '`1010`', '`A`'],
              ['15', '`1111`', '`F`'],
              ['16', '`0001 0000`', '`10`'],
              ['192', '`1100 0000`', '`C0`'],
              ['255', '`1111 1111`', '`FF`'],
            ],
          },
          { t: 'p', text: 'Adres MAC `ff:ff:ff:ff:ff:ff` to same jedynki, czyli **rozgłoszenie**: ramka trafia do wszystkich w sieci lokalnej. Zobaczysz go w zapytaniach ARP i DHCP.' },
        ],
        en: [
          { t: 'p', text: 'Hexadecimal (hex) has digits 0-9 and A-F (A = 10, F = 15). One hex digit is exactly 4 bits, so a byte is two digits. That is why MAC and IPv6 addresses are written in hex.' },
          {
            t: 'table',
            head: ['Decimal', 'Binary', 'Hex'],
            rows: [
              ['10', '`1010`', '`A`'],
              ['15', '`1111`', '`F`'],
              ['16', '`0001 0000`', '`10`'],
              ['192', '`1100 0000`', '`C0`'],
              ['255', '`1111 1111`', '`FF`'],
            ],
          },
          { t: 'p', text: 'The MAC `ff:ff:ff:ff:ff:ff` is all ones, the **broadcast**: the frame goes to everyone on the local network. You will see it in ARP and DHCP requests.' },
        ],
      },
    },
  ],
  quiz: [
    {
      id: 'q22-1',
      kind: 'input',
      q: l('Zamień 11000000 na liczbę dziesiętną.', 'Convert 11000000 to decimal.'),
      answer: ['192'],
      explain: l('128 + 64 = 192.', '128 + 64 = 192.'),
    },
    {
      id: 'q22-2',
      kind: 'input',
      q: l('Zamień 172 na postać binarną (8 bitów).', 'Convert 172 to binary (8 bits).'),
      answer: ['10101100'],
      placeholder: '00000000',
      explain: l('172 = 128 + 32 + 8 + 4, czyli 10101100.', '172 = 128 + 32 + 8 + 4, so 10101100.'),
    },
    {
      id: 'q22-3',
      kind: 'single',
      q: l('Ile wynosi największa wartość jednego oktetu?', 'What is the largest value of one octet?'),
      options: [l('128', '128'), l('254', '254'), l('255', '255'), l('256', '256')],
      answer: 2,
      explain: l('Osiem jedynek to 255. Możliwych wartości jest 256, od 0 do 255.', 'Eight ones are 255. There are 256 possible values, from 0 to 255.'),
    },
    {
      id: 'q22-4',
      kind: 'single',
      q: l('Ile bitów zapisuje jedna cyfra szesnastkowa?', 'How many bits does one hex digit hold?'),
      options: [l('2', '2'), l('4', '4'), l('8', '8'), l('16', '16')],
      answer: 1,
      explain: l('Cyfry 0-F to 16 wartości, a 2 do potęgi 4 to 16.', 'Digits 0-F are 16 values and 2 to the power of 4 is 16.'),
    },
    {
      id: 'q22-5',
      kind: 'input',
      q: l('Zapisz 255 w systemie szesnastkowym.', 'Write 255 in hexadecimal.'),
      answer: ['ff', '0xff'],
      explain: l('255 to 1111 1111, czyli FF.', '255 is 1111 1111, which is FF.'),
    },
    {
      id: 'q22-6',
      kind: 'single',
      q: l('Która wartość może wystąpić w masce podsieci?', 'Which value can appear in a subnet mask octet?'),
      options: [l('240', '240'), l('100', '100'), l('250', '250'), l('15', '15')],
      answer: 0,
      explain: l('W masce jedynki są ciągłe od lewej: 240 to 11110000. Pozostałe mają przerwy.', 'Mask ones are contiguous from the left: 240 is 11110000. The others have gaps.'),
    },
    {
      id: 'q22-7',
      kind: 'single',
      q: l('Co oznacza adres MAC ff:ff:ff:ff:ff:ff?', 'What does the MAC address ff:ff:ff:ff:ff:ff mean?'),
      options: [l('Brak karty sieciowej', 'No network card'), l('Rozgłoszenie do wszystkich w sieci lokalnej', 'Broadcast to everyone on the local network'), l('Adres routera', 'The router’s address'), l('Błąd sumy kontrolnej', 'A checksum error')],
      answer: 1,
      explain: l('Same jedynki w MAC to adres rozgłoszeniowy. Używa go np. ARP i DHCP.', 'All ones in a MAC is the broadcast address, used by ARP and DHCP.'),
    },
    {
      id: 'q22-8',
      kind: 'input',
      q: l('Zamień 00001010 na liczbę dziesiętną.', 'Convert 00001010 to decimal.'),
      answer: ['10'],
      explain: l('8 + 2 = 10.', '8 + 2 = 10.'),
    },
  ],
};
