import React, { useEffect, useMemo, useState } from 'react';

import { Sidebar } from './navigation/Sidebar';
import { Switch, Route, Redirect } from 'react-router';
import { NoteRoute } from './routes/NoteRoute';
import { useGetAllNotesQuery, useGetAllTagsQuery } from './api/client';
import { Load } from './common/Load';
import { ScratchRoute } from './routes/ScratchRoute';
import { Editable, Slate, withReact } from 'slate-react';
import { createEditor } from 'slate';
import { useDispatch } from 'react-redux';

import { tagSlice } from './store/store';

// @refresh reset

/**
 * Route for developing on the editor with no backend calls
 * @param props 
 */
export const DebugRoute = (props: {}) => {
  const editor = useMemo(() => withReact(createEditor()), []);

  const [body, setBody] = useState([{
    type: 'line',
    children: [{ text: 'hello world' }],
  }]);

  return (
    <>
      <Slate editor={editor} value={body} onChange={newValue => {
        setBody(newValue as any);
      }}>
        <div className="editor a-p4 a-ml4" >
          <Editable />
        </div>
      </Slate >
    </>
  );
}

/**
 * Hook to load initial data and block while doing so
 */
const useInitialData = () => {
  const [tagsResult,] = useGetAllTagsQuery();

  const { data: tagsData, fetching: tagsFetching, error: tagsError, } = tagsResult;

  const dispatch = useDispatch();

  useEffect(() => {
    if (tagsFetching === false && tagsData) {
      dispatch(tagSlice.actions.loadTags({ tags: tagsData.allTags }));
    }
  }, [tagsFetching]);

  return {
    loading: tagsFetching,
    errors: [tagsError].filter(n => !!n),
  }
}

const App = () => {
  const { loading, errors } = useInitialData();

  // TODO Improve this a lot
  if (loading) {
    return <>loading initial data</>;
  }

  if (errors.length > 0) {
    return <>errors loading initial data</>
  }

  return (
    <div className="App a-flex a-justify-center">
      <div className="a-flex">
        <Load
          hook={useGetAllNotesQuery}
          render={({ data, reload }) => {
            return <Sidebar notes={data.allNotes} reload={reload} />
          }}
        />

        <Switch>
          <Route path={"/note/:noteId"}>
            <NoteRoute />
          </Route>
          {/* Slate or my modifications doesn't seem to handle being updated in-place well, this is a simple hack to force the component to remount */}
          <Redirect from="/note-remount/:noteId" to="/note/:noteId" />
          <Route path="/scratch">
            <ScratchRoute />
          </Route>
          <Route path="/debug">
            <DebugRoute />
          </Route>
        </Switch>

      </div>
    </div>
  );
}

export default App;
