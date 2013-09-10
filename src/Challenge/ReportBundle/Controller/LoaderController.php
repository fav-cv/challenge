<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Component\HttpFoundation\Response;

class LoaderController extends Controller {

    /**
     * @Route("/load")
     * @Template()
     */
    public function loadAction() {

        $loaderService = $this->get('loader_service');
        
        $loaderService->generateProducts(1000);
        $loaderService->generateOrders(3000);

        $response = new Response();
        $response->setContent('ok!');
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

    /**
     * @Route("/load/products/{size}", name="loadProducts")
     * @Template()
     */
    public function loadProductsAction($size = 1000) {

        $loaderService = $this->get('loader_service');
        $loaderService->generateProducts($size);

        $response = new Response();
        $response->setContent("ok, $size products loaded !");
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

    /**
     * @Route("/load/orders/{size}", name="loadOrders")
     * @Template()
     */
    public function loadOrdersAction($size = 3000) {
        
        $loaderService = $this->get('loader_service');
        $loaderService->generateOrders($size);

        $response = new Response();
        $response->setContent("ok, $size orders loaded !");
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

}
