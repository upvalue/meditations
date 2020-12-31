import React from 'react';

import { MdSearch } from 'react-icons/md';

export const SearchBar = () => {
  return <div className="a-p4 search-container a-flex a-items-center">
    <MdSearch className="a-mr1 a-my1" />
    <input className="search-input a-flex-auto" type="text" placeholder="Search (non-functional)" />
  </div>
}