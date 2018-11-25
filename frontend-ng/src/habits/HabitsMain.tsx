import React from 'react';
import { useState, useEffect } from "react";
import { View } from "@upvalueio/third-coast";

import { tasksByDate, TasksByDateRequest } from "../api";
import { ScopeContainer } from "./ScopeContainer";

export const HabitsMain = () => {
  let [tasks, setTasks] = useState<TasksByDateRequest | null>(null);

  useEffect(() => {
    const promise = tasksByDate('2018-11-23', ['DAYS', 'MONTH', 'YEAR']);
    promise.then((res) => {
      setTasks(res);
    });
  }, []);

  return (
    <main className="ml3 flex-auto mt3">
      <View className="higher-scopes" flex="flex">
        <ScopeContainer name="Nov 20" className="mr2" />
        <ScopeContainer
          className="mr2"
          tasks={tasks && tasks.tasksByDate.Month}
        />
        <ScopeContainer name="2018" className="mr2" />
        <ScopeContainer name="Project" className="mr2" />
      </View>
    </main>
  );
}
