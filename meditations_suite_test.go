package main_test

import (
	"net/http/httptest"

	. "github.com/ioddly/meditations"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	"github.com/sclevine/agouti"
	. "github.com/sclevine/agouti/matchers"
	"gopkg.in/macaron.v1"

	"testing"
)

type pageFunc func(...agouti.Option) (*agouti.Page, error)

var phantomDriver = agouti.PhantomJS()
var page *agouti.Page
var server *httptest.Server

func testPage(browser string, newPage pageFunc) {
	var page *agouti.Page
	var server *httptest.Server
	var app *macaron.Macaron
	Config.DBPath = "test.sqlite3"

	BeforeEach(func() {
		app = App()
		server = httptest.NewServer(app)
		var err error
		page, err = newPage()
		Expect(err).NotTo(HaveOccurred())
		Expect(page.Navigate(server.URL)).To(Succeed())
	})

	AfterEach(func() {
		Expect(page.Destroy()).To(Succeed())
		server.Close()
	})

	Describe("page test for "+browser, func() {
		It("should have a window", func() {
			Expect(page).To(HaveWindowCount(1))
		})
	})
}

var _ = BeforeSuite(func() {
	Expect(phantomDriver.Start()).To(Succeed())
})

var _ = Describe("web tests", func() {
	testPage("phantom", phantomDriver.NewPage)
})

var _ = AfterSuite(func() {
	Expect(phantomDriver.Stop()).To(Succeed())
})

func TestMeditations(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Meditations Suite")
}
