package backend

import (
	"fmt"
	"log"
	"net/http"

	"gopkg.in/macaron.v1"
)

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

// serverError logs and returns a 500 error via Macaron
func serverError(c *macaron.Context, format string, a ...interface{}) {
	s := fmt.Sprintf(format, a...)
	log.Printf("Server error: %s\n", s)
	c.PlainText(http.StatusInternalServerError, []byte(s))
}
