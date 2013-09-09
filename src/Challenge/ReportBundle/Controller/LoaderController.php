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

    private function generateProducts($size, $em) {

        $batchSize = 50;

        for ($index = 0; $index < $size; $index++) {

            $product = new Product();
            $product->setProduct("product-$index");
            $product->setUnitPrice(200 + $index);
            $product->setUnitCost(110 + $index);

            $em->persist($product);
            if (($index % $batchSize) == 0) {
                $em->flush();
                $em->clear(); // Detaches all objects from Doctrine!
            }
        }
        

        // 10% of products are sold under its cost
        for ($index = 0; $index < ($size/10); $index++) {

            $product = new Product();
            $product->setProduct("product-under-cost-$index");
            $product->setUnitPrice(100 + $index);
            $product->setUnitCost(110 + $index);

            $em->persist($product);
            if (($index % $batchSize) == 0) {
                $em->flush();
                $em->clear(); // Detaches all objects from Doctrine!
            }
        }

        $em->flush();
        $em->clear(); // Detaches all objects from Doctrine!
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

        $batchSize = 20;

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

            foreach ($orderLines['lines'] as $orderLine) {
                $orderLine->setSalesOrder($order);
                $em->persist($orderLine);
            }

            if (($index % $batchSize) == 0) {
                $em->flush();
                $em->clear(); // Detaches all objects from Doctrine!
            }
        }

        $em->flush();
        $em->clear(); // Detaches all objects from Doctrine!
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
        $this->generateOrders(2000, $em);

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
    public function loadOrdersAction($size = 2000) {

        ini_set('max_execution_time', 300);
        $em = $this->getDoctrine()->getManager();

        $this->generateOrders($size, $em);

        $response = new Response();
        $response->setContent("ok, $size orders loaded !");
        $response->headers->set('Content-Type', 'text/plain');

        return $response;
    }

}
