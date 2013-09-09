<?php

namespace Challenge\ReportBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Component\HttpFoundation\Response;

use Challenge\ReportBundle\Entity\Product;
use Challenge\ReportBundle\Entity\SalesOrder;
use Challenge\ReportBundle\Entity\SalesOrderLine;

class LoaderController extends Controller {

    private function saveAndDetach($em, $entity) {

        $em->persist($entity);
        $em->flush();

        $em->detach($entity);
    }

    private function generateProducts($size, $em) {
        for ($index = 0; $index < $size; $index++) {

            $product = new Product();
            $product->setProduct("product-$index");
            $product->setUnitPrice(100 + $index);
            $product->setUnitCost(110 + $index);

            $this->saveAndDetach($em, $product);
        }
    }

    private function getEntity($name, $em) {

        $countDql = "SELECT COUNT(e) FROM $name e";
        $max = $em->createQuery($countDql)->getSingleScalarResult();
        
        $i = rand(0, ($max - 1));
        
        // Should use an order by
        $dql = "SELECT e FROM $name e";
        $query = $em->createQuery($dql)
                ->setFirstResult($i)
                ->setMaxResults(1);
        $results = $query->execute();

        return $results[0];
    }

    private function generateOrders($size, $em) {
        
        for ($index = 0; $index < $size; $index++) {

            $date = new \DateTime();
            $i = rand(0, 30);
            $date->modify("-$i day");            
            
            $order = new SalesOrder();
            $n = rand(1, 5);

            $orderLines = $this->getOrderLines($n, $em, $date);

            $order->setCountry($this->getEntity("ChallengeReportBundle:Country", $em));
            $order->setUsername("username-$index");
            $order->setTotalPrice($orderLines['totalPrice']);
            $order->setCreationDate($date);

            $em->persist($order);
            $em->flush();

            foreach ($orderLines['lines'] as $orderLine) {
                $orderLine->setSalesOrder($order);
                $this->saveAndDetach($em, $orderLine);
            }

            $em->detach($order);
        }
    }

    private function getOrderLines($size, $em, $date) {

        $totalPriceOrder = 0.0;
        $lines = array();

        for ($index = 0; $index < $size; $index++) {

            $quantity = 1 + $index;
            $product = $this->getEntity('ChallengeReportBundle:Product', $em);
            $totalPrice = $product->getUnitPrice() * $quantity;
            $totalCost = $product->getUnitCost() * $quantity;
            $totalProfit = $totalPrice - $totalCost;
            $totalPriceOrder += $totalPrice;

            $orderLine = new SalesOrderLine();
            $orderLine->setProduct($product);
            $orderLine->setQuantity($quantity);
            $orderLine->setTotalPrice($totalPrice);
            $orderLine->setTotalCost($totalCost);
            $orderLine->setTotalProfit($totalProfit);
            $orderLine->setUnitPrice($product->getUnitPrice());
            $orderLine->setUnitCost($product->getUnitCost());
            $orderLine->setCreationDate($date);

            $lines[] = $orderLine;
        }

        return array('totalPrice' => $totalPriceOrder, 'lines' => $lines);
    }

    /**
     * @Route("/load")
     * @Template()
     */
    public function loadAction() {
        
        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();
                
        $this->generateProducts(200, $em);                
        $this->generateOrders(500, $em);

        $response = new Response();
        $response->setContent('ok!');
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }
    
    /**
     * @Route("/load/products/{size}")
     * @Template()
     */
    public function loadProductsAction($size = 200) {
        
        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();
                
        $this->generateProducts($size, $em);  

        $response = new Response();
        $response->setContent("ok, $size products loaded !");
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }
    
    /**
     * @Route("/load/orders/{size}")
     * @Template()
     */
    public function loadOrdersAction($size = 200) {
        
        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();
                           
        $this->generateOrders($size, $em);

        $response = new Response();
        $response->setContent("ok, $size orders loaded !");
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

}
